# Progress

## 2026-11-15
- Người dùng bỏ xác minh SĐT (tốn phí), chuyển sang Google/Facebook. Hỏi 4 câu, chọn hết phương án đề xuất.
- Sao lưu diff OTP Firebase vào .planning/2026-11-15-firebase-phone-otp/phone-otp-firebase.patch.
- Backend: model/index/migration, verifier tổng quát, POST /auth/register (không OTP, 201 {user}), POST /auth/social; bỏ request-otp/verify-otp/check-phone/register/firebase.
- Frontend: firebaseAuthApi (popup), SocialLoginButtons, Login/Register/Account; bỏ OTP + countdown + reCAPTCHA. 302 test pass, lint sạch, build OK.
- Docs: docs/social-login.md mới, otp-configuration.md chỉ còn quên mật khẩu.
- Backend 387/387 test pass. Docker rebuild; migrate:soft-delete-indexes --write trên DB Docker (bỏ user_phone_active_unique). /register 201 → login OK, đăng ký trùng 409, /register/request-otp 404, /social token giả 401. Trang /login và /register hiện nút Google/Facebook, không lỗi console. Đã soft-delete tài khoản thử 0900000222.
