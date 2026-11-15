# Findings

- Checkout đã tự điền fullName/email/phone/address từ user; province/district/ward luôn rỗng; không lưu ngược về user.
- SHIPPING_PROVINCES (frontend/src/utils/shipping.js) đã là 34 tỉnh mới (tên ngắn, "TP. Hồ Chí Minh"). Phường gõ tay, Quận/Huyện là ô tuỳ chọn "(địa chỉ cũ)".
- orderService.cancelOrderInSession cho khách huỷ cả pending + confirmed (sai yêu cầu). statusTransitions admin: confirmed → cancelled hợp lệ.
- Mock: orderApi.cancel dùng mockDb.updateOrderStatus (đường admin), không kiểm tra chủ đơn.
- Dashboard backend: topProducts = productRepository.findTopSelling(5) chỉ điện thoại; revenueByMonth theo UTC; mock monthlyRevenue là số giả.
- reserveStock/releaseStock cập nhật `sold` → số đã bán cộng dồn đáng tin.
- customerOrderTotals đã có (orderCount tất cả đơn, totalSpent chỉ delivered/completed).
- Voucher: mã toàn cục, /vouchers/check không cần đăng nhập; reserve trong orderService.create (user bắt buộc vì POST /orders protect).
- paymentService.createVnpayCheckout gọi orderService.create với payload → saveAddress đi qua validators.createVnpay.
- chatTools.list_promotions liệt kê voucher active → phải loại voucher riêng.
