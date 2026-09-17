# 🚀 TỔNG HỢP TOÀN BỘ CÁC THAY ĐỔI & NÂNG CẤP HỆ THỐNG AI BRAIN

Tài liệu này tổng hợp toàn bộ các tính năng, nâng cấp kiến trúc, sửa lỗi bảo mật và tối ưu hóa trải nghiệm người dùng đã được thực hiện xuyên suốt các phiên làm việc.

---

## 📑 MỤC LỤC
1. [Phân Quyền, Bảo Mật & Xác Thực (RBAC & Auth)](#1-phân-quyền-bảo-mật--xác-thực-rbac--auth)
2. [Hệ Thống Kho Hàng & Trợ Lý Bán Hàng Đa Shop (Multi-Shop AI Inventory)](#2-hệ-thống-kho-hàng--trợ-lý-bán-hàng-đa-shop-multi-shop-ai-inventory)
3. [Kiến Trúc Lưu Trữ Thuần Cloud 100% (Zero-Local Storage)](#3-kiến-trúc-lưu-trữ-thuần-cloud-100-zero-local-storage)
4. [Tối Ưu Hóa Giao Diện & Trải Nghiệm Người Dùng (UI/UX)](#4-tối-ưu-hóa-giao-diện--trải-nghiệm-người-dùng-uiux)
5. [Bảng Tra Cứu File & Kết Quả Kiểm Thử Tự Động](#5-bảng-tra-cứu-file--kết-quả-kiểm-thử-tự-động)

---

## 1. PHÂN QUYỀN, BẢO MẬT & XÁC THỰC (RBAC & AUTH)

### 🔐 1.1. Cấu Hình Tài Khoản Root Admin & Bảo Mật Đăng Nhập
- Thiết lập và chuẩn hóa tài khoản **Root Admin** cao nhất của hệ thống:
  - **Email:** `adminAI@ai-brain.local`
  - **Mật khẩu:** `admin123456`
  - **Role:** `1` (`ADMIN`)
- Hệ thống hỗ trợ đăng nhập linh hoạt không phân biệt chữ hoa/thường (`adminai`, `adminai@ai-brain.local`, `admin@ai-brain.local`).

### 🛡️ 1.2. Chuẩn Hóa Phân Quyền Mặc Định Khi Đăng Ký (Strict Default User Role = 0)
- **Quy tắc an toàn tuyệt đối:** Mọi tài khoản mới khi Đăng ký qua Form (`/api/auth/register`) **100% bắt buộc nhận quyền thấp nhất là `Role 0` (Chủ Shop / User thường)**.
- **Loại bỏ lỗ hổng leo thang đặc quyền (Privilege Escalation):** Xóa bỏ hoàn toàn logic cũ tự động cấp quyền Admin nếu email chứa chữ "admin".
- Chỉ duy nhất tài khoản Root Admin hoặc người dùng được Root Admin trực tiếp phân quyền trên Modal Quản trị mới có thể sở hữu quyền **Admin (`1`)** hoặc **Bưu Cục (`2`)**.

### ⏱️ 1.3. Điều Chỉnh Giới Hạn Tần Suất (Rate Limit Policy)
- Cập nhật cấu hình Rate Limiting chống spam request: **15 lượt request/phút**.
- Ngăn chặn bot cào dữ liệu và bảo vệ hạn ngạch Token AI của hệ thống.

---

## 2. HỆ THỐNG KHO HÀNG & TRỢ LÝ BÁN HÀNG ĐA SHOP (MULTI-SHOP AI INVENTORY)

### 📊 2.1. Kích Hoạt Upload File Excel / CSV Kho Hàng Trên Chatbot
- Mở rộng bộ lọc `<input id="chatFileInput">` trên giao diện Chat cho phép chọn các định dạng: `.xlsx`, `.xls`, `.csv`.
- Hiển thị badge xem trước và badge tin nhắn đính kèm bảng tính màu xanh lục (`table_chart`) kèm dung lượng và số lượng sản phẩm.

### 🤖 2.2. Khởi Tạo Chuyên Biệt `Agent Quản Lý Kho & Bán Hàng (Smart Inventory)`
- Thêm cấu hình Agent trong `src/config/gemini.js` và bộ chỉ thị chuẩn mực tại `src/prompts/inventory.prompt.md`.
- **Sửa lỗi phân luồng AI Router:** Sử dụng Regex Word Boundary (`/\b(ads|campaign|cpc|ctr|roas)\b/i`) để không còn bắt nhầm từ khóa `ads` khi gửi file đường dẫn `/uploads/`.
- Tự động phân luồng tất cả các yêu cầu về kho hàng, bảng tính, hỏi giá, mua hàng, báo cáo sang Agent Quản Lý Kho & Bán Hàng.

### 🛡️ 2.3. Tư Vấn Bán Hàng Bảo Mật Tuyệt Đối (Security Guardrails)
- Khi khách hàng hỏi sản phẩm: Báo giá bán lẻ chính xác (VNĐ), công năng, tính năng và độ tương thích với các dòng xe (Wave, Sirius, Exciter, Air Blade, Vision, SH...).
- **BẢO MẬT 100% DỮ LIỆU NỘI BỘ:** AI **tuyệt đối KHÔNG TIẾT LỘ GIÁ NHẬP / GIÁ GỐC**, nhà cung cấp và vị trí kho/kệ hàng cho khách hàng.
- Ẩn tổng số lượng tồn kho chính xác với khách lạ (chỉ báo "Còn hàng" hoặc "Tạm hết hàng").

### 🛒 2.4. Quy Trình Chốt Đơn & Tự Động Trừ Tồn Kho
- Nhận diện ý định mua hàng ("mua", "lấy", "chốt", "đặt", "giao cho tôi").
- Thu thập thông tin giao hàng chuẩn mực: Họ tên, Địa chỉ nhận hàng, Số điện thoại.
- Xuất phiếu xác nhận đơn hàng tạm tính để khách kiểm tra.
- Khi khách xác nhận: Tự động lên đơn, phát thông báo biến động kho và **trừ trực tiếp số lượng tồn kho trong database Supabase**.

### ⚠️ 2.5. Cảnh Báo Tồn Kho Thấp & Báo Cáo Doanh Thu Kèm File Excel Thật
- **Cảnh báo hàng sắp hết:** Tự động lọc và cảnh báo cho Chủ Shop các mặt hàng có tồn kho dưới 15 sản phẩm (kèm vị trí kệ để chủ shop chủ động nhập hàng).
- **Xuất báo cáo doanh thu & File Excel cập nhật:** 
  - Tổng hợp số đơn, số lượng đã bán và doanh thu trong ngày.
  - Tự động sinh file Excel `.xlsx` gồm 2 Sheet (`TonKhoThucTe` và `DoanhThu_ChiTiet`) tải lên Supabase Storage và cung cấp nút bấm **[Tải File Excel Cập Nhật]** trực tiếp trong khung chat.

---

## 3. KIẾN TRÚC LƯU TRỮ THUẦN CLOUD 100% (ZERO-LOCAL STORAGE)

- **Triệt tiêu ghi file rác xuống ổ cứng máy chủ:**
  - File Excel / CSV được đọc trực tiếp từ bộ nhớ RAM (`Buffer`) và truyền thẳng lên **Supabase Storage (Bucket `kho`)**.
  - `src/controllers/upload.controller.js` đã xóa bỏ hoàn toàn lệnh `fs.writeFileSync` vào thư mục `src/storage/uploads/`.
  - Mọi URL trả về cho người dùng đều là URL Public vĩnh viễn trên Cloud Supabase (`https://...supabase.co/storage/v1/object/public/kho/...`).
- Đã dọn dẹp sạch sẽ toàn bộ các file `.xlsx` tạm thời còn sót lại trên ổ cứng local.

---

## 4. TỐI ƯU HÓA GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

### ☀️ 4.1. Khắc Phục Lỗi Giao Diện Light Mode
- Đồng bộ bảng màu và độ tương phản của chế độ Sáng (Light Mode) cho Header, Khung Chat, Bảng điều khiển và Drawer ghi chú.
- Đảm bảo các huy hiệu Role (Chủ Shop / Bưu Cục / Admin) hiển thị sắc nét, đúng chuẩn thẩm mỹ cao cấp.

### 🏪 4.2. Tự Động Đồng Bộ Shop ID Trên Storefront (`shop-test.html`)
- Trang Storefront khách hàng (`public/shop-test.html`) tự động nạp email đăng nhập của Chủ Shop (`localStorage.getItem('user_info')`) vào ô chọn cửa hàng.
- Khắc phục triệt để lỗi khách hỏi không tìm thấy hàng do lệch mã Shop ID (`shop_honda_01` vs `email`).
- Sửa lỗi hiển thị thẻ script thô trên giao diện HTML.

---

## 5. BẢNG TRA CỨU FILE & KẾT QUẢ KIỂM THỬ TỰ ĐỘNG

### 📁 Các File Mã Nguồn Trọng Tâm Đã Nâng Cấp:
| Tên File | Vai Trò & Thay Đổi Chính |
| :--- | :--- |
| [`src/config/gemini.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/config/gemini.js) | Khởi tạo cấu hình `inventory` agent cho hệ sinh thái AI Karik. |
| [`src/prompts/inventory.prompt.md`](file:///d:/GIAHUY/jarvis-ai-brain/src/prompts/inventory.prompt.md) | Bộ chỉ thị prompt chuẩn hóa quy tắc bảo mật giá nhập và tư vấn bán hàng. |
| [`src/services/ai/router.service.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/services/ai/router.service.js) | Phân luồng AI thông minh, sửa regex word boundary tránh bắt nhầm `ads`. |
| [`src/services/ai/aiManager.service.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/services/ai/aiManager.service.js) | Kết nối Main Chat với `ShopChatbotService` & `ShopReportService`. |
| [`src/controllers/upload.controller.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/controllers/upload.controller.js) | Xử lý upload trực tiếp lên Cloud Supabase, xóa ghi file local. |
| [`src/services/ai/shopChatbot.service.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/services/ai/shopChatbot.service.js) | Mở rộng regex báo cáo, lọc bỏ dòng ghi chú rác trong Excel. |
| [`src/services/inventory/shopReport.service.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/services/inventory/shopReport.service.js) | Xuất báo cáo doanh thu & file Excel tồn kho 2 Sheet cập nhật. |
| [`src/repositories/shopKnowledge.repository.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/repositories/shopKnowledge.repository.js) | Quản lý kho tri thức đa shop trên 1 bảng duy nhất, cách ly shop 100%. |
| [`src/services/auth/auth.service.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/services/auth/auth.service.js) | Khóa cứng mặc định `role: '0'` khi đăng ký mới, bảo vệ tài khoản Root Admin. |
| [`src/middlewares/rateLimit.js`](file:///d:/GIAHUY/jarvis-ai-brain/src/middlewares/rateLimit.js) | Cấu hình giới hạn tần suất 15 requests/phút. |
| [`public/js/chat.js`](file:///d:/GIAHUY/jarvis-ai-brain/public/js/chat.js) | Gửi kèm `x-shop-id` & `x-user-email` khi chat, render badge Excel. |
| [`public/js/drawer.js`](file:///d:/GIAHUY/jarvis-ai-brain/public/js/drawer.js) | Render link file Excel thành nút Tải File màu xanh lục chuyên nghiệp. |
| [`public/shop-test.html`](file:///d:/GIAHUY/jarvis-ai-brain/public/shop-test.html) | Tự động đồng bộ Shop ID theo tài khoản đang đăng nhập. |

### 🧪 Kết Quả Kiểm Thử (Verification Suite):
```bash
node --test tests/unit/singleTableShopKnowledge.test.js tests/unit/smartInventory.test.js tests/unit/aiRouter.test.js tests/unit/auth.test.js
```
- **16/16 Unit Tests** vượt qua thành công 100%:
  - ✔️ Đăng ký tài khoản mới luôn mang quyền `Role 0` (Chủ Shop).
  - ✔️ Đăng nhập tài khoản Root Admin `adminAI@ai-brain.local` chính xác.
  - ✔️ Upload file Excel kho -> Train Vector RAG Supabase thành công.
  - ✔️ Tư vấn sản phẩm, báo giá chính xác, ẩn giá nhập và vị trí kho nội bộ.
  - ✔️ Chốt đơn 4 bước & trừ kho tự động.
  - ✔️ Cách ly dữ liệu đa shop 100% không bị xung đột.
  - ✔️ Xuất báo cáo doanh thu & sinh file Excel cập nhật trên Supabase Storage.
  - ✔️ Router phân luồng chính xác tới `Agent Quản Lý Kho & Bán Hàng`.
