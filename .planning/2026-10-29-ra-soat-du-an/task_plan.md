# Task Plan: Rà soát toàn bộ dự án PhoneShopAI

## Goal
Chạy test/lint/build, rà soát backend + frontend + giao diện + tài liệu bằng các skill trong `.claude/skills/`, ghi lỗi vào findings.md, lập plan sửa và liệt kê phần còn thiếu để người dùng làm tiếp. KHÔNG tự sửa code khi chưa được duyệt.

## Current Phase
Phase 7 (phần còn thiếu của đồ án)

## Phases

### Phase 1: Dọn skill cũ
- [x] Xoá thư mục gốc `skills/` (đã có bản trong `.claude/skills/`)
- [x] `git rm --cached` skill cũ (.claude/skills superpowers, .agents, .codex, .hallmark)
- [x] Thêm `.claude/skills/` và `skills/` vào .gitignore
- **Status:** complete

### Phase 2: Kiểm thử tự động
- [x] backend `npm test` — 279/279 pass
- [x] frontend `vitest run` 213/213 pass, `lint` 0 lỗi, `build` pass khi có env
- **Status:** complete

### Phase 3: Rà soát code (backend, frontend)
- [x] Order, payment SePay, chat, auth, routes
- **Status:** complete

### Phase 4: Rà soát giao diện (redesign-existing-projects)
- [x] Audit theo checklist ở mức mã nguồn (chưa xem bằng trình duyệt)
- **Status:** complete

### Phase 5: Tổng hợp phần còn thiếu + plan sửa
- [x] findings.md đầy đủ
- **Status:** complete

### Phase 6: Sửa lỗi (CHỜ NGƯỜI DÙNG DUYỆT – chưa làm)
Thứ tự ưu tiên. Mỗi mục sửa xong phải chạy lại test tương ứng.
- [x] F1 (U1) Thêm favicon: `frontend/public/favicon.svg` + `<link rel="icon">` trong `index.html` — skill: redesign-existing-projects
- [x] F2 (E1) README: ghi rõ cần `cp .env.example .env` trước `npm run build`
- [x] F3 (C1) Chatbot `lookup_order`: áp giới hạn tra đơn riêng (vd 10 lần/15 phút theo phiên/IP) — skill: full-output-enforcement; thêm test vào `backend/tests/chat.test.js`
- [x] F4 (B1) Làm tròn tiền giảm giá voucher `%` (`Math.round`) trong `orderService.calculateDiscount`; thêm test
- [x] F5 (B4) Mã vận đơn: dùng mã đơn hoặc chuỗi ngẫu nhiên thay `Date.now()`
- [x] F6 (U3) Thêm skip link "Bỏ qua tới nội dung" vào StoreLayout
- [x] F7 (U2, U4) `og:image` mặc định; `text-wrap: balance` cho tiêu đề; `tabular-nums` cho cột giá
- [x] F8 (B5, D1, D2) Dọn CI (bỏ nhánh devdhuy/devthuy, URL techphone), cập nhật CLAUDE.md; đánh dấu tài liệu kế thừa
- [x] F9 (B3) Chuyển truy vấn Model trực tiếp trong orderService/authMiddleware về repository (refactor, rủi ro thấp – tuỳ chọn)
- [x] F10 (B2) Người dùng chọn GIỮ NGUYÊN: khách vãng lai chỉ xem, mua phải đăng ký + đăng nhập (30/10)
- **Status:** complete

### Phase 7: Phần còn thiếu của đồ án (người dùng làm, Claude hỗ trợ)
- [ ] M1 Báo cáo tiến độ tuần 1 (19–25/10) và tuần 2 (26/10–1/11) → `progress-report/`
- [ ] M2 Hướng dẫn cài đặt + dữ liệu thử → `setup/`
- [ ] M3 Sơ đồ ảnh cho báo cáo (use case, kiến trúc, tuần tự, ERD) → drawio-skill (cần cài draw.io desktop) hoặc xuất Mermaid
- [ ] M4 Quyển báo cáo đồ án (Word) → `thesis/doc`, xuất PDF → `thesis/pdf`
- [ ] M5 Slide thuyết trình + video demo → `thesis/abs`
- [ ] M6 Tài liệu tham khảo → `thesis/refs`
- [ ] M7 (tuỳ chọn) Triển khai công khai để demo
- [ ] M8 Cập nhật/đánh dấu tài liệu kế thừa TechPhone trong `docs/`
- **Status:** pending

## Next Step
Phase 6 xong và đã push (30/10). Tiếp theo: hỏi người dùng muốn làm mục nào của Phase 7 trước (gợi ý M1 báo cáo tiến độ).

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Plan lưu ở `.planning/` | Không làm rối thư mục gốc; hỏi người dùng có push hay không |
| Không dùng skill tạo ảnh (imagegen-*, brandkit, image-to-code), stitch, gpt-taste | Không có công cụ tạo ảnh / Google Stitch; gpt-taste là hướng tạo trang mới, không phải rà soát |
| drawio-skill chỉ dùng để kiểm tra phần sơ đồ còn thiếu | draw.io desktop chưa cài |
| Chưa sửa code | Người dùng yêu cầu note + plan; quy tắc: không tự ý làm |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `npm run build`: VITE_SITE_URL is required in production | 1 | Không phải lỗi code: thiếu `frontend/.env`. Build lại với biến từ `.env.example` → pass |
