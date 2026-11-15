# Findings

- Luồng OTP cũ đã có: `authService.storeAndDeliverOtp` (băm, 10 phút, 5 lần sai), Twilio provider. Docker chạy `NODE_ENV=production` mà không truyền biến TWILIO → request-otp trả 503.
- Twilio → số VN: từ 25/08/2025 chặn hẳn sender ID chưa đăng ký; đăng ký cần giấy phép kinh doanh → không khả thi.
- Firebase: Spark không có Phone Auth SMS ("Not applicable"); Blaze tính theo tin. Số thử nghiệm (tối đa 10) không gửi SMS. Mặc định SMS region policy không cho nước nào. Tài liệu: "localhost is not allowed as a hosted domain for the purposes of phone auth".
- Firebase ID token: RS256, `aud` = projectId, `iss` = https://securetoken.google.com/<projectId>, claim `phone_number` dạng E.164, `firebase.sign_in_provider` = 'phone'. Chứng chỉ: https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com (cache theo max-age).
- firebaseConfig người dùng gửi: projectId `phoneshopai`, authDomain `phoneshopai.firebaseapp.com` (giá trị public, để trong .env, không commit).
- Tunnel ngrok trỏ vào backend (webhook SePay), không phải frontend.
- `firebase` mới nhất trên npm: 13.3.0.
