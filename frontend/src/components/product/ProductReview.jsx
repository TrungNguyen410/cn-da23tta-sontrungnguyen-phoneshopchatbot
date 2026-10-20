import { useEffect, useMemo, useState } from 'react';
import { FiImage, FiStar, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { reviewApi } from '../../api/reviewApi';
import { uploadApi } from '../../api/uploadApi';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatCurrency';
import EmptyState from '../common/EmptyState';

export default function ProductReview({ productId, accessoryId, onRequireLogin, onSummaryChange }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ratingFilter, setRatingFilter] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const isAccessoryReview = Boolean(accessoryId);
  const reviewSummary = useMemo(() => {
    const counts = [1, 2, 3, 4, 5].reduce(
      (result, star) => ({ ...result, [star]: reviews.filter((review) => review.rating === star).length }),
      {},
    );
    const average = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;
    return { average, counts };
  }, [reviews]);
  const visibleReviews = ratingFilter
    ? reviews.filter((review) => review.rating === ratingFilter)
    : reviews;

  useEffect(() => {
    onSummaryChange?.({ average: reviewSummary.average, count: reviews.length });
  }, [onSummaryChange, reviewSummary.average, reviews.length]);

  useEffect(() => {
    const loadReviews = isAccessoryReview ? reviewApi.getByAccessory(accessoryId) : reviewApi.getByProduct(productId);
    loadReviews.then(setReviews);
  }, [accessoryId, isAccessoryReview, productId]);

  const uploadImages = async (event) => {
    if (!isAuthenticated) {
      event.target.value = '';
      return onRequireLogin();
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
    if (!isAuthenticated) return onRequireLogin();
    if (comment.trim().length < 10) return toast.error('Nội dung đánh giá cần ít nhất 10 ký tự');

    setSubmitting(true);
    try {
      await reviewApi.create({
        productId: isAccessoryReview ? 'general' : productId,
        accessoryId: isAccessoryReview ? accessoryId : null,
        userId: user.id,
        userName: user.fullName,
        rating,
        comment: comment.trim(),
        images,
        status: 'pending',
      });
      setComment('');
      setImages([]);
      toast.success('Đánh giá đã được gửi và đang chờ duyệt');
    } catch (error) {
      toast.error(error.response?.status === 409
        ? `Bạn đã đánh giá ${isAccessoryReview ? 'phụ kiện' : 'sản phẩm'} này rồi`
        : (error.friendlyMessage || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="product-reviews">
      <div className="section-heading"><div><span>Phản hồi thực tế</span><h2>{isAccessoryReview ? 'Đánh giá phụ kiện' : 'Đánh giá sản phẩm'}</h2></div></div>
      <div className="product-review-summary panel" aria-label="Tổng quan đánh giá">
        <div className="review-average">
          <strong>{reviewSummary.average.toFixed(1)}</strong>
          <span><FiStar /> trên 5</span>
          <small>{reviews.length} đánh giá đã duyệt</small>
        </div>
        <div className="review-distribution">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviewSummary.counts[star];
            const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <button
                type="button"
                key={star}
                className={ratingFilter === star ? 'active' : ''}
                aria-pressed={ratingFilter === star}
                onClick={() => setRatingFilter((current) => (current === star ? 0 : star))}
              >
                <span>{star} <FiStar /></span>
                <i><b style={{ transform: `scaleX(${percentage / 100})` }} /></i>
                <small>{count}</small>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="review-filter-reset"
          disabled={!ratingFilter}
          onClick={() => setRatingFilter(0)}
        >
          {ratingFilter ? `Bỏ lọc ${ratingFilter} sao` : 'Đang xem tất cả'}
        </button>
      </div>
      <div className="review-layout">
        <form className="review-form panel" onSubmit={submit}>
          <h3>Chia sẻ trải nghiệm</h3>
          <label>Chọn số sao</label>
          <div className="star-picker">
            {[1, 2, 3, 4, 5].map((star) => (
              <button type="button" key={star} className={star <= rating ? 'active' : ''} onClick={() => setRating(star)}>
                <FiStar />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={isAccessoryReview ? 'Phụ kiện này có điểm gì nổi bật?' : 'Sản phẩm này có điểm gì nổi bật?'}
            rows="4"
          />
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
                  <button type="button" onClick={() => setImages((current) => current.filter((item) => item !== image))}>
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary" disabled={uploading || submitting}>
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </form>
        <div className="review-list">
          {visibleReviews.length === 0 ? (
            <EmptyState title="Chưa có đánh giá" description="Hãy là người đầu tiên chia sẻ trải nghiệm." />
          ) : visibleReviews.map((review) => (
            <article className="review-item" key={review.id}>
              <div className="review-avatar">{review.userName.charAt(0)}</div>
              <div>
                <div className="review-author"><strong>{review.userName}</strong><span>{formatDate(review.createdAt)}</span>{review.verifiedPurchase && <small className="verified-review">Đã mua hàng</small>}</div>
                <div className="review-stars">{Array.from({ length: 5 }, (_, index) => <FiStar key={index} className={index < review.rating ? 'filled' : ''} />)}</div>
                <p>{review.comment}</p>
                {review.images?.length > 0 && (
                  <div className="review-images">
                    {review.images.map((image) => <img key={image} src={image} alt="Ảnh đánh giá" />)}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
