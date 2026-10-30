# Findings: Rà soát PhoneShopAI (2026-10-29)

## Bối cảnh
- Đồ án chuyên ngành, thời gian 19/10/2026 – 31/12/2026. Phần mới: Chatbot AI (Gemini) + thanh toán SePay.
- README ghi: backend 279 test, frontend 213 test.
- Thư mục `thesis/{doc,pdf,html,abs,refs}`, `progress-report/`, `setup/`, `docker/` chỉ có `.gitkeep` → CHƯA có nội dung.

## Backend
| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| B1 | Thấp | `src/services/orderService.js:178` `calculateDiscount` | Voucher % không làm tròn → tổng tiền có thể lẻ (vd 10% của 12.345.678 = 1.234.567,8đ). Cần kiểm tra lại số tiền VietQR/SePay khớp đối chiếu. |
| B2 | Hỏi | `src/routes/orderRoutes.js:30` | `POST /orders` bắt buộc `protect` (phải đăng nhập), trong khi service có xử lý khách vãng lai (`guest:` idempotency key) và có `optionalProtect`. Cần hỏi: có cho đặt hàng không đăng nhập không? |
| B3 | Thấp | `src/services/orderService.js:5-6`, `src/middlewares/authMiddleware.js:3` | Gọi thẳng Mongoose model trong service/middleware, lệch quy tắc "không bỏ lớp" trong CLAUDE.md. |
| B4 | Thấp | `src/services/orderService.js:276` | `trackingNumber` = `Date.now()` cắt 10 số → 2 đơn cùng mili-giây trùng mã vận đơn. |
| B5 | Thấp | `.github/workflows/ci.yml` | CI còn nhánh của dự án cũ (`devdhuy`, `devthuy`) và URL `techphone.example`. |

## Giao diện (skill: redesign-existing-projects)
Stack: React 19 + Bootstrap 5 + CSS riêng (`tokens.css`, `main.css` 3.7k dòng, `redesign.css` 1.6k, `admin.css`, `responsive.css`). Font: Space Grotesk / IBM Plex Sans / JetBrains Mono. Màu đã gom về token (không có mã hex rải trong CSS ngoài tokens.css).
| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| U1 | Trung bình | `frontend/index.html`, `frontend/public/` | Không có favicon (public chỉ có `_redirects`, index.html không có `<link rel="icon">`). Tab trình duyệt hiện icon mặc định. |
| U2 | Thấp | `frontend/index.html`, `src/hooks/usePageMeta.js:35` | Không có `og:image` → chia sẻ link lên Facebook/Zalo không có ảnh. |
| U3 | Thấp | toàn bộ layout | Không có link "Bỏ qua tới nội dung" (skip link) cho người dùng bàn phím. |
| U4 | Thấp | CSS | Chưa dùng `text-wrap: balance` cho tiêu đề; `tabular-nums` chỉ có ở 1 file (bảng giá/admin nên dùng). |
| OK | – | – | Có `prefers-reduced-motion`, `focus-visible`, dùng `100dvh`, không có `href="#"`, không dùng `window.alert/confirm`, chỉ 1 inline style. `alt=""` 11 chỗ đều là ảnh cạnh tên sản phẩm (trang trí) → chấp nhận được. |

## Chatbot (backend)
| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| C1 | Thấp–TB | `backend/src/services/chatTools.js:300`, `backend/src/routes/chatRoutes.js:10` | Công cụ `lookup_order` của chatbot gọi thẳng `orderService.lookup` → không chịu giới hạn tra đơn của API (10 lần/15 phút), chỉ bị giới hạn chat 20 tin/phút. Có thể dùng chatbot để dò đơn nhanh hơn ~30 lần. Kết quả đã che tên/SĐT nên rủi ro thấp. |
| OK | – | `paymentService.processSepayWebhook` | Xác thực API key so sánh an toàn, chống trùng theo reference, cộng dồn chuyển thiếu, xử lý đơn đã huỷ → refund_required. Không thấy lỗi. |
| OK | – | `chatService.assertOwner` | Phiên chat kiểm tra chủ sở hữu (user hoặc visitorId). |

## Tài liệu / cấu hình
| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| D1 | Thấp | `CLAUDE.md` | Còn tên "TechPhone Store" và chưa nhắc Chatbot/SePay. (Mật khẩu demo 123456 là đúng: seed mặc định 123456 ngoài production.) |
| D2 | Thấp | `docs/jira/jira-plan.md`, `docs/burndown-plan.md`, `docs/report/software-engineering-report.md`, `docs/diagrams/*` | Tài liệu kế thừa từ TechPhone-Store (sprint 2 tuần, team nhiều người, tên cũ) — không khớp đồ án cá nhân PhoneShopAI. |

## Phần còn thiếu (so với README + quy định thư mục)
- `thesis/doc` — quyển báo cáo đồ án (Word) : TRỐNG
- `thesis/pdf` — bản PDF báo cáo : TRỐNG
- `thesis/html` : TRỐNG
- `thesis/abs` — slide thuyết trình, video demo : TRỐNG
- `thesis/refs` — tài liệu tham khảo : TRỐNG
- `progress-report/` — báo cáo tiến độ hằng tuần (README có nhắc) : TRỐNG (đề tài bắt đầu 19/10 → đã 2 tuần)
- `setup/` — hướng dẫn cài đặt, dữ liệu thử : TRỐNG
- Sơ đồ dạng ảnh cho quyển báo cáo: chỉ có Mermaid trong md (`docs/phoneshopai-analysis-design.md`, `docs/diagrams/`). Chưa có PNG/drawio. drawio-skill cần cài draw.io desktop.
- Triển khai công khai (URL chạy thật): không thấy URL deploy nào.
- Toàn bộ yêu cầu chức năng CB-01..CB-13, PAY-01..PAY-03 trong tài liệu thiết kế đã đánh dấu ✅.

## Kết quả kiểm thử tự động (2026-10-29)
| Lệnh | Kết quả |
|---|---|
| backend `npm test` | 27 suite, **279/279 pass** |
| frontend `vitest run` | 54 file, **213/213 pass** |
| frontend `npm run lint` | 0 lỗi |
| frontend `npm run build` (không có `.env`) | **Lỗi**: `VITE_SITE_URL is required in production` — do máy chưa có `frontend/.env`, đây là chốt chặn cố ý trong `vite.config.js` |
| frontend `npm run build` (env theo `.env.example`) | Pass |
| E1 | Thấp | `frontend/` | Máy chưa có `frontend/.env` → `npm run build` lỗi. Chỉ cần `cp .env.example .env`. README chưa nói build cần file này. |
