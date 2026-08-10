# Sử dụng Alpine Node.js 22 chính thức (được yêu cầu bởi @supabase/supabase-js >= 22.0.0)
FROM node:22-alpine

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và package-lock.json để tối ưu hóa Docker layer caching
COPY package*.json ./

# Cài đặt các dependencies cho sản phẩm
RUN npm ci --omit=dev

# Sao chép toàn bộ mã nguồn ứng dụng
COPY . .

# Khai báo port ứng dụng sử dụng
EXPOSE 3000

# Thiết lập biến môi trường mặc định
ENV NODE_ENV=production
ENV PORT=3000

# Lệnh khởi chạy ứng dụng
CMD ["node", "server.js"]
