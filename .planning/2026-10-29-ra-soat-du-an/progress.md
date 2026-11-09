# Progress Log

## Session 2026-10-29
- Dọn skill cũ: xoá `skills/` gốc, `git rm --cached` skill cũ (265 file, chưa commit), thêm `.claude/skills/` + `skills/` vào `.gitignore`.
- Test: backend 279/279, frontend 213/213, lint 0 lỗi, build pass (cần `frontend/.env`).
- Rà soát: order, payment SePay, chat, auth, routes, CSS/giao diện (redesign-existing-projects), tài liệu.
- Kết quả: findings.md (B1–B5, C1, U1–U4, D1–D2, E1, phần còn thiếu M1–M8). Plan sửa: task_plan.md Phase 6–7.
- Chưa sửa code. Chờ người dùng duyệt.

## Session 2026-10-30
- Người dùng duyệt sửa toàn bộ plan; B2 giữ nguyên (khách chỉ xem, mua phải đăng nhập); push tất cả trừ skill.
- F1 favicon.svg + F7 og-image.png (1200×630, render bằng Chrome headless), og:image mặc định trong index.html và usePageMeta.
- F3 chatbot `lookup_order` giới hạn 10 lần/15 phút/IP (chatTools + chatService + chatController), test mới trong chat.test.js.
- F4 làm tròn giảm giá % (backend orderService + frontend checkoutPricing), test mới.
- F5 mã vận đơn = `TPX` + phần số của mã đơn, test trong order-dashboard.test.js.
- F6 skip link ở StoreLayout và AdminLayout, test trong AppRoutes.test.jsx. F7 text-wrap: balance, tabular-nums cho giá.
- F2 README (build cần .env, số test), F8 CI bỏ nhánh devdhuy/devthuy + URL phoneshopai, CLAUDE.md, docs/README.md phân loại tài liệu.
- F9 thêm `stockedRepository` (reserveStock/releaseStock); orderService và authMiddleware không gọi Model trực tiếp nữa.
- Kiểm thử: backend 283/283, frontend 215/215, lint 0, build pass (có env).

## Session 2026-10-30 (chiều)
- Cài gh 2.103.3, draw.io 32.6.1, Python 3.12 (winget). CI commit 22fb60d: success.
- Jira → Done: SCRUM-20, 47, 63, 65, 66, 67, 7, 8, 9 (epic), 18, 24 (báo cáo tuần do người dùng tự làm), 21, 49.
- Sơ đồ (drawio-skill): 2 use case, ERD 15 collection, 2 activity swimlane, 3 sequence (seqlayout.py). validate.py: 0 lỗi. Xuất .drawio.png (-e -s 2) + repair_png.py.
- setup/README.md: cài đặt 3 cách, biến môi trường, dữ liệu thử (tài khoản, đơn, voucher, câu hỏi chatbot, webhook SePay), lỗi thường gặp.

## Session 2026-11-04 — Spec Kit: chatbot tư vấn chính xác
- Lỗi người dùng báo: hỏi điện thoại trên 20 triệu ra sản phẩm test 2.000đ. Nguyên nhân: parseBudget hiểu sai "trở lên", "ngoài", "từ A đến B", "củ", số đầy đủ.
- Bootstrap `.specify/` (PowerShell), constitution v1.0.0, spec `specs/001-chatbot-tu-van-chinh-xac/` (Q1: không lọc theo ngưỡng giá; Q2: nhớ điều kiện trong phiên).
- Plan + research (R1–R8) + data-model + contracts + quickstart. Chờ người dùng xác nhận R2 rồi /speckit-tasks.
- R2 người dùng chốt: "20 triệu" → 20–22 triệu (+10%); "tầm 20 triệu" → 16–20 triệu. `.specify/`, `specs/` không push (đã thêm .gitignore).
- Implement T001–T028: `utils/budget.js` (51 câu test, backend + bản sao frontend), `utils/needs.js`, lớp kiểm tra cuối + gần khoảng giá nhất trong `chatTools`, nhớ điều kiện theo phiên (`ChatSession.context`), dòng điều kiện đầu câu trả lời, prompt Gemini, mock frontend, eval 38 câu.
- Kiểm thử: backend 364/364, frontend 273/273, lint 0, build pass, coverage đạt ngưỡng. Eval offline đầu-cuối (DB có điện thoại 2.000đ): 38/38, trung bình 87ms.
- Người dùng đồng ý push (04/11): commit, chờ CI, tạo task Jira riêng.
- Commit 343faa0 đã push; CI run 41830348683: Backend tests, Frontend quality, Docker build đều success. Jira SCRUM-73 (con của E3) tạo mới và chuyển Done.

## Session 2026-11-09 — code-review + security-review, sửa lỗi giao diện
- Atlas đã kết nối và seed (người dùng tự làm). Đổi tên repo trong 3 file Word báo cáo tiến độ cho khớp GitHub.
- security-review toàn bộ backend/frontend: không có lỗ hổng đạt ngưỡng.
- code-review (commit Noir & Gold): sửa 1) màu oklch cho Chart.js qua `utils/canvasColor.js` (+test); 2) nền đen `.thumbnail-row img`; 3) icon FiX cho "Hết hàng"; 4) reset hover trên màn hình cảm ứng cho product/category card; 5) Dashboard chờ `document.fonts.ready` trước khi vẽ biểu đồ; 7) `will-change` chỉ khi không bật reduced-motion.
- Không sửa mục 6 (grain phủ toàn màn hình mobile): bỏ `height: 35%` là chủ ý để không có vệt cắt ngang; lớp này tĩnh. Mục 8–10 (CSS trùng) chưa làm.
- Kiểm thử: frontend lint 0, vitest 275/275, build pass.
