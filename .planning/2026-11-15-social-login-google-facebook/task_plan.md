# Task Plan: Bỏ OTP đăng ký, thêm đăng nhập Google + Facebook (Firebase)

## Goal
Đăng ký bằng SĐT + mật khẩu không cần mã OTP; khách đăng nhập/đăng ký bằng Google hoặc Facebook qua Firebase Authentication (gói Spark, miễn phí). Admin vẫn đăng nhập SĐT + mật khẩu.

## Decisions (người dùng chọn 15/11)
- Giữ form đăng ký SĐT + mật khẩu, bỏ bước OTP.
- Tài khoản Google/Facebook không bắt buộc SĐT; SĐT nhập khi đặt hàng.
- Quên mật khẩu giữ nguyên (OTP backend).
- Dùng Firebase Authentication (popup), backend tự kiểm tra ID token.

## Decisions (kỹ thuật, tự chọn)
- Không tự gộp tài khoản theo email (tránh chiếm tài khoản); email đã thuộc tài khoản khác → 409.
- User: phone/password không bắt buộc; thêm authProvider (phone|google|facebook), firebaseUid.
- Index phone mới chỉ áp cho phone kiểu string; index firebaseUid unique. Migration soft-delete-indexes bỏ index phone cũ.
- Bản sao lưu phần OTP Firebase cũ: .planning/2026-11-15-firebase-phone-otp/phone-otp-firebase.patch

## Current Phase
Phase 3

## Phases
### Phase 1: Backend
- [x] Model + index + migration
- [x] Token verifier tổng quát
- [x] authService/validators/controller/routes/swagger
- [x] Tests (social-login.test.js thay firebase-registration.test.js)
- **Status:** complete

### Phase 2: Frontend
- [x] runtimeConfig, firebaseAuthApi, authApi, AuthContext, mockDb
- [x] SocialLoginButtons, Login, Register, Account
- [x] CSS, tests (302 pass, lint sạch, build OK)
- **Status:** complete

### Phase 3: Docs + kiểm thử Docker
- [x] docs (otp-configuration, social-login, README, env examples)
- [x] backend full test (387 pass), Docker rebuild, migration index, kiểm tra endpoint + giao diện
- **Status:** complete

## Next Step
Người dùng bật Google + Facebook trong Firebase/Meta (docs/social-login.md) rồi thử đăng nhập thật; commit/push khi người dùng yêu cầu.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
