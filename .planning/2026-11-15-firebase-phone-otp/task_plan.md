# Task Plan: Đăng ký bằng OTP Firebase Phone Auth

## Goal
Trang Đăng ký gửi/xác minh OTP qua Firebase Phone Auth (project `phoneshopai`); backend tự kiểm tra Firebase ID token rồi mới tạo tài khoản. Giữ nút "Gửi lại mã" + đếm ngược 60s.

## Next Step
Xong và đã kiểm thử thật trên Docker. Chờ người dùng quyết định commit/push (chưa commit).

## Decisions
- Thư viện: thêm `firebase` vào frontend (người dùng gửi firebaseConfig để gắn vào code). Backend KHÔNG thêm thư viện: kiểm tra ID token bằng `jsonwebtoken` + chứng chỉ công khai của Google (securetoken).
- Chỉ dùng Firebase khi `VITE_USE_MOCK=false` và đủ biến `VITE_FIREBASE_*`; thiếu thì giữ luồng OTP cũ của backend (dev hiện debugOtp, mock mã 123456).
- Không dùng Analytics (`measurementId` bỏ qua) để không thêm cookie/theo dõi.
- Quên mật khẩu giữ nguyên (người dùng chưa chọn áp dụng).
- Kiểm tra số điện thoại đã đăng ký TRƯỚC khi gửi SMS (endpoint check-phone) để không tốn tin.
- Firebase được tải lười (dynamic import) chỉ ở trang Đăng ký.

## Phases
### Phase 1: Backend — verifier + endpoints + test
**Status:** complete
- `services/firebaseTokenVerifier.js`, `env.firebase.projectId`
- `POST /api/auth/register/check-phone`, `POST /api/auth/register/firebase`
- validators, swagger, tests

### Phase 2: Frontend — firebase SDK + Register
**Status:** complete
- `runtimeConfig.firebase`, `services/firebasePhoneAuth.js`, authApi, AuthContext, Register.jsx, tests

### Phase 3: Cấu hình + tài liệu
**Status:** complete
- `.env.example` (root, frontend, backend), docker-compose args/env, frontend Dockerfile ARG
- `docs/otp-configuration.md` phần Firebase + bước người dùng tự làm

### Phase 4: Kiểm thử
**Status:** complete
- lint, vitest, jest, build; thử Firebase thật với số thử nghiệm trên Chrome nếu được

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| PhoneAuthPages test fail sau khi tạo frontend/.env (test tự chuyển sang Firebase) | 1 | vite.config test.env xóa VITE_FIREBASE_* |
| Firebase: OPERATION_NOT_ALLOWED "SMS unable to be sent until this region enabled" | 1 | Việc của người dùng: SMS region policy → Vietnam |
