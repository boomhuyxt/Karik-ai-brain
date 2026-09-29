# Personalized Hybrid Image Studio

## Goal
Nâng Studio thành hệ thống hybrid: AI tạo key visual không chứa chữ, Fabric dựng typography/layer chính xác, đồng thời cá nhân hoá và tránh lặp theo lịch sử người dùng.

## Tasks
- [x] Tạo design engine với style catalog, schema sở thích, chống lặp và 3 biến thể → Verify: unit tests trả về ba cấu hình khác nhau, hợp lệ.
- [x] Nâng API `/api/image` để lập art direction và sinh key visual hybrid → Verify: controller tests cho happy path và validation.
- [x] Viết lại `image.prompt.md` theo creative brief, taxonomy mở và output schema mới → Verify: prompt chứa invariants về chữ, layer và lịch sử.
- [x] Thêm bảng điều khiển sở thích, creative brief, biến thể và nút sinh key visual trong Studio → Verify: DOM/API contract tests.
- [x] Truyền hồ sơ/lịch sử Studio vào chat để agent tạo poster đúng gu → Verify: orchestrated prompt nhận context đã sanitize.
- [x] Ghi nhớ sở thích và lịch sử gần nhất trong trình duyệt, có nút đổi kiểu thật sự → Verify: unit tests cho storage/history helpers.
- [x] Cập nhật tài liệu/schema và chạy test + syntax/lint checks → Verify: 15 targeted tests, syntax checks, lint runner và API runtime đều đạt.

## Done When
- [x] Người dùng có thể lưu gu thiết kế, nhận 3 art direction khác biệt, sinh key visual rồi ghép chữ/layer có thể chỉnh sửa, và thiết kế kế tiếp tránh lặp lịch sử gần nhất.

## Notes
- Giữ tương thích ngược với `json:poster-config` và các preset cũ.
- Không rasterize chữ vào ảnh AI; chữ/CTA luôn là layer Fabric để giữ độ chính xác.
- Suite `npm test` cũ không tự kết thúc trong 2 phút, kể cả khi dùng `--test-force-exit`; các test liên quan thay đổi và API runtime đã được chạy riêng thành công.
