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
