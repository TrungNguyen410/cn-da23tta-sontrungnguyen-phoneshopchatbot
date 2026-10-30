# Sơ đồ draw.io – PhoneShopAI

Các sơ đồ dùng cho quyển báo cáo (Chương 3). Mỗi sơ đồ có hai tệp:

- `*.drawio` – tệp gốc, mở bằng draw.io desktop hoặc https://app.diagrams.net để chỉnh sửa.
- `*.drawio.png` – ảnh 2x để chèn vào báo cáo. Ảnh có nhúng sẵn sơ đồ, kéo thả vào draw.io là sửa tiếp được.

Màu xanh lá đánh dấu phần **mới của đồ án** (Chatbot AI, thanh toán SePay); màu xanh dương là phần kế thừa từ TechPhone-Store.

## Use case

| Sơ đồ | Nội dung |
|---|---|
| [usecase-khach-hang](usecase-khach-hang.drawio.png) | Khách vãng lai, khách hàng, Google Gemini API, SePay |
| [usecase-quan-tri](usecase-quan-tri.drawio.png) | Quản trị viên: quản lý bán hàng, chatbot, kho kiến thức |

## Cơ sở dữ liệu

| Sơ đồ | Nội dung |
|---|---|
| [erd](erd.drawio.png) | 15 collection MongoDB và quan hệ (ký hiệu chân quạ) |

## Activity (luồng hoạt động)

| Sơ đồ | Nội dung |
|---|---|
| [activity-dat-hang-thanh-toan](activity-dat-hang-thanh-toan.drawio.png) | Đặt hàng, chọn COD / chuyển khoản, SePay tự xác nhận, chuyển thiếu |
| [activity-chatbot](activity-chatbot.drawio.png) | Kiểm tra giới hạn, function calling với Gemini, dự phòng offline |

## Sequence (tuần tự)

| Sơ đồ | Nội dung |
|---|---|
| [sequence-dat-hang](sequence-dat-hang.drawio.png) | Tạo đơn trong transaction: idempotency, giữ voucher, trừ kho |
| [sequence-chatbot](sequence-chatbot.drawio.png) | Chatbot trả lời bằng function calling, streaming SSE |
| [sequence-sepay](sequence-sepay.drawio.png) | Webhook SePay đối chiếu mã đơn + số tiền, trang đơn tự cập nhật |

## Xuất lại ảnh

Sau khi sửa `.drawio`, xuất lại bằng draw.io desktop (File → Export as → PNG, bật "Include a copy of my diagram"), hoặc dòng lệnh:

```bash
draw.io -x -f png -e -s 2 -b 10 -o erd.drawio.png erd.drawio
```
