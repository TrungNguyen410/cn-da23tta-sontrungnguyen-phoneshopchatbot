import { useEffect, useMemo, useState } from 'react';
import { FiImage, FiMessageSquare, FiStar, FiX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { reviewApi } from '../api/reviewApi';
import { uploadApi } from '../api/uploadApi';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatCurrency';

export default function Reviews() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState(0);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { reviewApi.getAll().then(setReviews); }, []);
  const approved = reviews.filter((review) => review.status === 'approved');
  const visible = filter ? approved.filter((review) => review.rating === filter) : approved;
  const average = useMemo(() => approved.length ? approved.reduce((sum, review) => sum + review.rating, 0) / approved.length : 0, [approved]);

  const uploadImages = async (event) => {
    if (!isAuthenticated) {
      event.target.value = '';
      return navigate('/login', { state: { from: location } });
    }

    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (images.length + files.length > 5) return toast.error('Bạn chỉ có thể tải tối đa 5 ảnh cho một đánh giá');

    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => uploadApi.reviewImage(file)));
      setImages((current) => [...current, ...uploaded.map((item) => item.url)]);
    } catch (error) {
      toast.error(error.friendlyMessage || error.message || 'Không thể tải ảnh đánh giá');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) return navigate('/login', { state: { from: location } });
    if (form.comment.trim().length < 10) return toast.error('Nội dung cần ít nhất 10 ký tự');

    try {
      const review = await reviewApi.create({
        productId: 'general',
        userId: user.id,
        userName: user.fullName,
        ...form,
        images,
        status: 'pending',
      });
      setReviews([review, ...reviews]);
      setForm({ rating: 5, comment: '' });
      setImages([]);
      toast.success('Cảm ơn bạn! Đánh giá đang chờ duyệt.');
    } catch (error) {
      toast.error(error.response?.status === 409 ? 'Bạn đã gửi đánh giá dịch vụ rồi' : (error.friendlyMessage || error.message));
    }
  };

  return (
    <main className="page-shell reviews-page">
      <div className="container">
        <div className="page-hero">
          <div><span>Khách hàng nói gì</span><h1>Trải nghiệm thật, chia sẻ thật</h1><p>Những phản hồi giúp TechPhone phục vụ bạn tốt hơn mỗi ngày.</p></div>
          <FiMessageSquare />
        </div>
        <section className="review-summary panel">
          <div className="average-score"><strong>{average.toFixed(1)}</strong><div><span>{Array.from({ length: 5 }, (_, index) => <FiStar key={index} className={index < Math.round(average) ? 'filled' : ''} />)}</span><small>{approved.length} đánh giá đã duyệt</small></div></div>
          <div className="rating-filters"><button className={filter === 0 ? 'active' : ''} onClick={() => setFilter(0)}>Tất cả</button>{[5, 4, 3, 2, 1].map((star) => <button key={star} className={filter === star ? 'active' : ''} onClick={() => setFilter(star)}>{star} <FiStar /></button>)}</div>
        </section>
        <div className="reviews-layout">
          <section className="public-review-list">
            {visible.map((review) => (
              <article className="review-item panel" key={review.id}>
                <div className="review-avatar">{review.userName.charAt(0)}</div>
                <div>
                  <div className="review-author"><strong>{review.userName}</strong><span>{formatDate(review.createdAt)}</span></div>
                  <div className="review-stars">{Array.from({ length: 5 }, (_, index) => <FiStar key={index} className={index < review.rating ? 'filled' : ''} />)}</div>
                  <p>{review.comment}</p>
                  {review.images?.length > 0 && <div className="review-images">{review.images.map((image) => <img key={image} src={image} alt="Ảnh đánh giá" />)}</div>}
                </div>
              </article>
            ))}
          </section>
          <form className="panel global-review-form" onSubmit={submit}>
            <h2>Gửi đánh giá</h2><p>Chia sẻ cảm nhận về dịch vụ TechPhone.</p>
            <label>Mức độ hài lòng</label>
            <div className="star-picker">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} className={star <= form.rating ? 'active' : ''} onClick={() => setForm({ ...form, rating: star })}><FiStar /></button>)}</div>
            <textarea rows="6" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder="Hãy kể cho chúng tôi về trải nghiệm của bạn..." />
            <label className="review-upload">
              <input type="file" accept="image/*" multiple onChange={uploadImages} disabled={uploading || images.length >= 5} />
              <span><FiImage /> {uploading ? 'Đang tải ảnh...' : 'Tải ảnh đánh giá'}</span>
              <small>{images.length}/5 ảnh</small>
            </label>
            {images.length > 0 && (
              <div className="review-image-preview">
                {images.map((image) => (
                  <div key={image}>
                    <img src={image} alt="Ảnh đánh giá" />
                    <button type="button" onClick={() => setImages((current) => current.filter((item) => item !== image))}><FiX /></button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" disabled={uploading}>Gửi đánh giá</button>
          </form>
        </div>
      </div>
    </main>
  );
}
