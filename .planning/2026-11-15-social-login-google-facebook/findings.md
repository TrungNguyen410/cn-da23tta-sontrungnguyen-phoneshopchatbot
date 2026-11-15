# Findings

- Firebase pricing: Phone Auth chỉ có ở Blaze; 10 SMS/ngày miễn phí, VN $0.13/SMS (cloud.google.com/identity-platform/pricing). Google/Facebook sign-in miễn phí trên Spark.
- Google Cloud Free Trial $300/90 ngày: không tính tiền trong/after trial trừ khi nâng tài khoản trả phí (firebase.blog 2024/11).
- initializeAuth cần popupRedirectResolver: browserPopupRedirectResolver thì signInWithPopup mới chạy.
- Popup phải mở trong user gesture → tải trước SDK khi trang mount.
- User model: phone required, password required; index user_phone_active_unique partial {isDeleted:false} → nhiều user không có phone sẽ trùng null. Phải đổi index (tên mới) + migration bỏ index cũ.
- Mongoose autoIndex mặc định bật → index mới tự tạo khi app khởi động; index cũ phải drop bằng migrate:soft-delete-indexes --write.
- login cho phép identifier là email → user không có password phải chặn trước bcrypt.compare.
- updateProfile không cho sửa phone; shippingAddress có phone riêng.
- nginx.conf không có CSP/COOP → popup Firebase không bị chặn.
