# Thiết kế thích nghi zero-cost cho Netlify và Vercel

**Ngày:** 10/08/2026
**Base source:** `origin/main` tại commit `016176c`
**Mục tiêu:** Deploy TechPhone Store bằng Netlify + Vercel + MongoDB Atlas + Cloudinary với chi phí bắt buộc 0 đồng, giữ toàn bộ bản vá bảo mật đã merge và không thêm tính năng nghiệp vụ.

## Bối cảnh

Source mới nhất trên GitHub đã harden production theo Render và chủ động từ chối mọi serverless target vì backend còn route ghi file local. Tuy nhiên frontend đã có luồng upload trực tiếp lên Cloudinary và không cần backend lưu ảnh khi production được cấu hình đúng.

Thiết kế này chỉ tháo điểm chặn hạ tầng cho Vercel/Netlify. Các luồng catalog, đăng nhập, giỏ hàng, checkout, COD, quản trị, OTP, thanh toán và migration không thay đổi nghiệp vụ.

## Quyết định đã duyệt

Chọn giữ source mới nhất và thích nghi tối thiểu cho serverless:

1. Frontend React/Vite chạy trên Netlify.
2. Express API chạy trên Vercel.
3. MongoDB Atlas Free là nơi lưu dữ liệu lâu dài.
4. Cloudinary unsigned upload là nơi lưu ảnh production.
5. Upload local chỉ còn hợp lệ ở local, Docker và Render có persistent disk.
6. Vercel không ghi hoặc phục vụ file local lâu dài; upload backend fail closed rõ ràng.
7. OTP dùng implementation Twilio Messaging hiện có; Twilio Trial được timebox, thất bại thì dùng tài khoản seed và bằng chứng test.
8. COD là phương thức thanh toán bắt buộc để báo cáo. VNPay không chặn deploy.

## Các phương án không chọn

### Chuyển toàn bộ sang Render

Phù hợp với source hiện tại nhưng không đáp ứng yêu cầu Netlify + Vercel và persistent disk có thể phát sinh giới hạn/gói dịch vụ.

### Quay lại source cũ

Giữ nguyên runbook cũ nhưng làm mất nhiều bản vá bảo mật, migration, rate-limit, contract và test mới đã merge. Rủi ro cao và không được sử dụng.

## Kiến trúc đích

```text
Browser
  -> Netlify static SPA
       -> Vercel Express API
            -> MongoDB Atlas Free
       -> Cloudinary unsigned upload

Twilio Trial (tùy chọn, timebox)
  <- Vercel OTP delivery service
```

Netlify chỉ chứa file build. Vercel không phải nơi lưu ảnh. URL Cloudinary được lưu trong document sản phẩm/review trên Atlas.

## Thay đổi backend

### Cấu hình deployment target

`backend/src/config/env.js` tiếp tục tự nhận diện marker `VERCEL`, nhưng production target `vercel` không còn bị từ chối.

Env export thêm một boolean có tên rõ nghĩa, ví dụ `localUploadsEnabled`:

- `true`: local, test, Docker và Render.
- `false`: Vercel, Netlify Functions, generic serverless và AWS Lambda.

Render vẫn bắt buộc `UPLOAD_DIR=/app/uploads`. Vercel không yêu cầu `UPLOAD_DIR`.

### Proxy và URL

`trustProxy` bằng `1` cho các hosted proxy target gồm Render và serverless; bằng `false` cho local/Docker. Public URL production vẫn phải là HTTP(S), không chứa credential/path/query/fragment và không được trỏ loopback trên hosted targets.

Swagger tiếp tục lấy server URL từ `API_PUBLIC_URL` và thêm `/api`.

### Upload local trên serverless

Khi `localUploadsEnabled=false`:

- Không mount `express.static()` tại `/uploads`.
- Mọi endpoint `/api/uploads/*` trả `503` với thông báo production phải dùng Cloudinary/URL HTTPS.
- Request bị chặn trước multer và trước khi ghi file.
- Không fallback sang filesystem tạm.

Khi `localUploadsEnabled=true`, hành vi upload hiện tại được giữ nguyên để không phá local/Docker/Render.

### Database và API

Không thay đổi repository/service/model hoặc transaction checkout. Atlas phải là replica set. Kết nối Mongoose được module cache tái sử dụng trong Vercel cold/warm instances theo behavior hiện tại.

## Thay đổi frontend

`frontend/src/utils/deploymentConfig.js` cho phép target `netlify`. Production Netlify phải đặt:

```env
VITE_DEPLOYMENT_TARGET=netlify
VITE_USE_MOCK=false
VITE_API_URL=https://<vercel-project>.vercel.app/api
VITE_SITE_URL=https://<netlify-site>.netlify.app
```

Netlify cũng phải từ chối URL loopback như Render. Docker/local-preview vẫn được phép dùng localhost theo các quy tắc hiện có.

Vite và `@vitejs/plugin-react` được chuyển sang `devDependencies`; build output không đổi.

Upload frontend giữ implementation hiện tại:

- Có Cloudinary cloud name + unsigned preset: upload thẳng Cloudinary.
- Thiếu Cloudinary: ẩn/tắt device upload và yêu cầu URL ảnh HTTPS lâu dài.
- Không gọi backend upload local để bù.

## OTP zero-cost

Source mới đã có Twilio Messaging provider với ba env:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
```

Không thay bằng Twilio Verify trong đợt deploy này. Twilio Trial chỉ thử tối đa 90 phút với recipient đã xác minh. Nếu SMS Việt Nam không đến hoặc Trial không cấp sender phù hợp:

- Xóa/không điền ba env Twilio trên Vercel.
- Production tiếp tục fail closed `503`, không trả `debugOtp`.
- Demo production dùng tài khoản seed.
- Báo cáo dùng test OTP hash, hết hạn, giới hạn lần thử và one-time consumption làm bằng chứng.

## Dữ liệu và seed

Chỉ chạy seed trên Atlas demo mới và sau khi xác nhận không có dữ liệu cần giữ. Seed password tối thiểu 12 ký tự được lưu ngoài Git. Database mới không chạy migration dữ liệu cũ.

## Kiểm thử

Mọi thay đổi hành vi dùng TDD.

Backend phải có test cho:

1. Vercel production target được chấp nhận.
2. Vercel dùng một trusted proxy hop.
3. Vercel không bật local uploads và không yêu cầu `UPLOAD_DIR`.
4. Platform marker `VERCEL` thắng explicit target khác.
5. `/api/uploads/*` trả `503` trước khi ghi file trên serverless.
6. Local/Docker/Render upload tests hiện có vẫn pass.
7. Hosted production URLs từ chối loopback.

Frontend phải có test cho:

1. `netlify` là production target hợp lệ.
2. Netlify từ chối API/site loopback.
3. Cloudinary upload contract hiện có vẫn pass.
4. Production build với target Netlify tạo đúng metadata.

Gate cuối:

- Backend test coverage PASS.
- Frontend lint, toàn bộ Vitest và build PASS.
- `npm audit --omit=dev` không có runtime vulnerability chưa xử lý.
- Secret scan và `git diff --check` PASS.

## Deploy và bằng chứng

Thứ tự bắt buộc:

1. Merge/push bản thích nghi lên GitHub `main` mà không force-push.
2. Tạo Atlas Free và database user.
3. Tạo Netlify site để lấy URL frontend.
4. Tạo Vercel project root `backend`, điền production env và kiểm tra `/api/health`.
5. Seed Atlas demo.
6. Cấu hình Netlify API/site/target/Cloudinary env và deploy lại.
7. Thêm `TechPhone Demo 5G`, kiểm tra persistence và COD.
8. Thử Twilio Trial hoặc chốt fallback.
9. Chạy smoke test và chụp bằng chứng báo cáo.

## Không nằm trong phạm vi

- Không thêm payment gateway mới.
- Không làm webhook ngân hàng/MoMo/VNPay production.
- Không mua SMS, domain, database, storage hoặc hosting plan.
- Không refactor nghiệp vụ ngoài phần cần thiết để chạy Netlify/Vercel.
- Không khôi phục upload local trên Vercel bằng `/tmp`.

## Tiêu chí hoàn thành

Thiết kế hoàn thành khi Netlify gọi được Vercel không lỗi CORS, admin thêm được sản phẩm bằng ảnh Cloudinary/URL HTTPS, dữ liệu tồn tại sau redeploy, khách đặt và tra cứu được COD, OTP chốt rõ nhánh Trial hoặc fallback, toàn bộ gate local/CI PASS và repository không chứa secret.
