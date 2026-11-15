# Progress

## Session 15/11
- Người dùng gửi firebaseConfig, yêu cầu gắn đăng nhập bằng số điện thoại (Firebase) vào code.
- Đã làm trước (chưa commit): nút "Gửi lại mã" + đếm ngược 60s, backend chặn 60s/số (429), mock tương tự. Test xanh (FE 292, BE 375).
- Phase 1 backend: firebaseTokenVerifier (jsonwebtoken + khóa Google), POST /register/check-phone, /register/firebase, swagger, 7 test mới. BE 382 test xanh.
- Phase 2 frontend: cài firebase@13.3.0; api/firebasePhoneApi.js (lazy, inMemoryPersistence, reCAPTCHA ẩn mới mỗi lần gửi, lỗi tiếng Việt); Register dùng Firebase khi phoneOtpProvider='firebase'; ẩn badge reCAPTCHA + dòng thông báo. FE 300 test xanh, lint sạch.
- Phase 3: .env.example (gốc/frontend/backend), docker-compose args+env, Dockerfile ARG, docs/otp-configuration.md. Ghi giá trị thật vào .env gốc, backend/.env, frontend/.env (gitignored).
- Phase 4: build OK (Firebase chunk riêng ~36 KB gzip). Thử thật trên Chrome: Firebase trả OPERATION_NOT_ALLOWED do chưa bật SMS region policy Vietnam; authorizedDomains có localhost. Backend tải được 2 khóa RSA thật của Google, token giả → 401.
- npm audit: 4 cảnh báo high từ @grpc/grpc-js (Firestore phía Node, không vào bundle trình duyệt) + follow-redirects (có sẵn qua axios).
- Người dùng bật SMS region policy (Vietnam) + số thử nghiệm. Mở Docker Desktop, `docker compose up -d --build`.
- Kiểm thử thật trên http://localhost:3000/register: số 0900000111 → Firebase gửi (reCAPTCHA ẩn tự qua) → mã 246810 → POST /api/auth/register/firebase 201 → chuyển /login → đăng nhập được (customer, phoneVerified=true). check-phone với số đã có → 409; token giả → 401.
- Dọn dẹp: đăng xuất; xóa mềm (isDeleted=true) tài khoản thử để người dùng thử lại cùng số.
