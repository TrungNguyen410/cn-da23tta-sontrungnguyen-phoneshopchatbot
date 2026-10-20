# Đánh giá Chatbot AI

Bộ 26 câu hỏi trong [`backend/scripts/evaluateChatbot.mjs`](../../backend/scripts/evaluateChatbot.mjs), chạy bằng:

```bash
cd backend
npm run eval:chatbot -- http://localhost:5000/api   # backend đang chạy, đã npm run seed
```

Mỗi câu có tiêu chí đạt/không đạt (ví dụ: gợi ý đúng tầm giá, gọi đúng công cụ, không lộ dữ liệu khách). Kết quả chi tiết (câu trả lời, công cụ đã gọi, thời gian) lưu trong các file JSON cùng thư mục.

## Kết quả ngày 20/10/2026

| Lần chạy | Chế độ | Đạt | Ghi chú |
|---|---|---|---|
| 1 | Gemini `gemini-3.5-flash` (key miễn phí) | 21/26 (81%) | Chỉ 8 câu được Gemini trả lời – **8/8 đạt**; 18 câu còn lại rơi về chế độ dự phòng do Google quá tải (503) hoặc quá 40 giây. 5 câu sai đều thuộc chế độ dự phòng. Thời gian Gemini: 4,5–19,4 giây. |
| 2 | Dự phòng – key hết hạn mức ngày (429) | 24/26 (92%) | [`result-2026-10-20-fallback-quota.json`](result-2026-10-20-fallback-quota.json). Sau lần 1 đã sửa: sạc dự phòng, mã giảm giá cụ thể, “trả lại”, câu ngoài phạm vi, so khớp nguyên từ. |
| 3 | Offline (không dùng Gemini) | **26/26 (100%)** | [`result-2026-10-20-offline.json`](result-2026-10-20-offline.json). Sửa thêm: hiển thị “còn hàng”, ưu tiên cụm từ khoá trong kho kiến thức. Trung bình 52 ms/câu. |

### Theo nhóm (lần 3 – offline)

| Nhóm | Đạt |
|---|---|
| Tư vấn | 6/6 |
| So sánh | 2/2 |
| Chi tiết sản phẩm | 1/1 |
| Phụ kiện | 2/2 |
| Tra cứu đơn | 3/3 |
| Khuyến mãi | 2/2 |
| Chính sách | 5/5 |
| Ngoài phạm vi | 2/2 |
| Bảo mật (prompt injection, ép giá, xin dữ liệu khách) | 3/3 |

## Nhận xét

- **Gemini gọi đúng công cụ** trong mọi câu được trả lời (tìm sản phẩm theo hãng/giá, so sánh, chi tiết) và chỉ đưa ra sản phẩm có thật.
- **Hạn mức miễn phí của Gemini** chỉ 20 lượt gọi/ngày/model; mỗi câu trả lời có tra dữ liệu tốn ≥ 2 lượt ⇒ khoảng 10 câu/ngày. Khi hết hạn mức (429) hệ thống tạm nghỉ model 10 phút và trả lời offline ngay, không làm khách phải chờ.
- **Độ trễ Gemini** dao động lớn (4–40 giây) theo tải của Google; streaming giúp khách thấy chữ sớm.
- **Cần chạy lại lần Gemini** khi có hạn mức mới (hoặc bật thanh toán cho API key) để có số liệu đầy đủ cho Chương 4.
