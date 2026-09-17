# Kế Hoạch: Chuẩn Hóa Phân Quyền Mặc Định Khi Đăng Ký Tài Khoản (Default User Role = 0)

## 1. Bối cảnh & Mục tiêu (Context & Objectives)
- **Mục tiêu:** Mọi tài khoản mới khi thực hiện Đăng ký qua Form Đăng ký (`/api/auth/register`) **bắt buộc 100%** phải được cấp quyền thấp nhất là **`User / Chủ Shop` (Role `0`)**.
- **Vấn đề tồn đọng cần khắc phục:**
  1. Trong mã nguồn cũ, có logic kiểm tra `email.includes('admin')` tự động nâng quyền lên Admin cho bất kỳ ai đăng ký email có chứa chữ "admin". Điều này phải được loại bỏ triệt để.
  2. Chỉ duy nhất tài khoản **Root Admin hệ thống** (`adminAI@ai-brain.local` / `admin@ai-brain.local` / `usr_admin`) hoặc các tài khoản được Root Admin trực tiếp phê duyệt / phân quyền trên Modal Admin mới có thể sở hữu quyền Admin (Role `1`) hoặc Bưu Cục (Role `2`).
  3. Mọi tài khoản mới đăng ký khi đăng nhập sẽ chỉ nhìn thấy giao diện **Chủ Shop / User thường** (Workspace trợ lý AI bán hàng, không hiển thị các công cụ quản trị Admin/Bưu cục).

---

## 2. 🧠 Brainstorm: Các Phương Án Xử Lý (Options Analysis)

### Option A: Khóa Cứng (Hard-coded Strict Default) + Root Admin Whitelist *(Được Đề Xuất)*
- Gán mặc định `role: "0"` cho mọi lượt đăng ký mới trong `auth.service.js` và `user.repository.js`.
- Loại bỏ toàn bộ fallback `email.includes('admin')`.
- Chỉ các ID/Email nằm trong Whitelist cố định (`usr_admin`, `adminAI@ai-brain.local`, `admin@ai-brain.local`) hoặc được lưu `role = 1` trong database mới có quyền Admin.
- ✅ **Ưu điểm:** An toàn tuyệt đối, ngăn chặn leo thang đặc quyền (Privilege Escalation), phân tách rõ ràng 3 phân cấp vai trò.
- ❌ **Nhược điểm:** Cần cập nhật unit test hiện có để tương thích.
- 📊 **Effort:** Thấp (Low)

### Option B: Kiểm Tra Phân Quyền Động Qua Bảng Quyền RBAC Database
- Lưu danh sách role trong bảng `roles` riêng biệt của Supabase và gán Foreign Key `role_id = 0`.
- ✅ **Ưu điểm:** Mở rộng linh hoạt khi có thêm role 3, 4, 5.
- ❌ **Nhược điểm:** Phụ thuộc vào kết nối Supabase, nếu Supabase mất mạng thì luồng đăng ký có thể bị chậm hoặc lỗi.
- 📊 **Effort:** Trung bình (Medium)

---

## 3. Đề Xuất Giải Pháp Triển Khai (Proposed Implementation)

### 3.1. Cập Nhật [auth.service.js](file:///d:/GIAHUY/jarvis-ai-brain/src/services/auth/auth.service.js)
- Trong hàm `register({ email, password, fullName })`:
  - Luôn truyền cứng `role: '0'` vào `userRepository.createUser`.
  - Token sinh ra luôn mang `role: '0'`.
- Trong hàm `login(email, password)`:
  - Xác định vai trò strictly từ `user.role` trong database hoặc memory.
  - Xóa bỏ triệt để logic `user.email.includes('admin') ? '1' : '0'`.
  - Chỉ coi là Admin nếu `user.role === '1'` hoặc là tài khoản Root Admin `adminAI@ai-brain.local` / `admin@ai-brain.local`.

### 3.2. Cập Nhật [user.repository.js](file:///d:/GIAHUY/jarvis-ai-brain/src/repositories/user.repository.js)
- Trong hàm `createUser`:
  - Mặc định trường `role: '0'` và `role_id: '0'` khi insert vào database Supabase & Map bộ nhớ.
- Trong hàm `findByEmail` và `findById`:
  - Mặc định trả về `role: '0'` nếu không tìm thấy dữ liệu role.

### 3.3. Cập Nhật [auth.js (Middleware)](file:///d:/GIAHUY/jarvis-ai-brain/src/middlewares/auth.js)
- Hàm `isUserAdmin(user)`:
  - Chỉ trả về `true` nếu `user.role === '1'` hoặc email thuộc danh sách Root Admin.

---

## 4. Kế Hoạch Kiểm Thử (Verification Plan)
1. **Test Đăng Ký Mới:**
   - Đăng ký một tài khoản bất kỳ (ví dụ: `newuser_test@gmail.com` hoặc `admin_fake@gmail.com`).
   - Kiểm tra `user.role` trả về phải luôn là `'0'` (Chủ Shop / User).
2. **Test Đăng Nhập Sau Đăng Ký:**
   - Đăng nhập với tài khoản mới -> Giao diện Header hiển thị Badge **`CHỦ SHOP`**, không có các nút Admin.
3. **Chạy Unit Test Toàn Bộ:**
   - Chạy `node --test tests/unit/auth.test.js tests/unit/postOfficeModule.test.js` để đảm bảo hệ thống chạy mượt mà 100%.
