# Báo cáo Đồ án: Hệ thống Phân tích Dữ liệu Bán lẻ

## 1. Tổng quan
- **Mục tiêu**: Xây dựng hệ thống thu thập dữ liệu bán hàng, phân tích doanh thu, tạo báo cáo trực quan và dự đoán xu hướng cho doanh nghiệp bán lẻ.
- **Mô hình kiến trúc**: Microservices gồm các dịch vụ: Sales Service, Product Service, Analytics Service, User Service.
- **Thành phần hệ thống**: Frontend, Backend, Message Broker, Database, CI/CD, Observability.

## 2. Kiến trúc tổng thể
- **Kiểu kiến trúc**: Microservices + Event-driven (Message Broker)
- **Luồng dữ liệu (tóm tắt)**:
  1. Sales Service ghi nhận đơn hàng → phát sự kiện qua Message Broker.
  2. Analytics Service tiêu thụ sự kiện, tổng hợp số liệu, lưu kết quả.
  3. Product Service quản lý sản phẩm (giá, tồn kho, danh mục).
  4. User Service quản lý người dùng và phân quyền.
  5. Frontend hiển thị Dashboard, biểu đồ, báo cáo, và kết quả dự báo.

```
[Frontend] ⇄ [Backend API Gateway/NestJS]
      |                 |-- Sales Service
      |                 |-- Product Service
      |                 |-- User Service
      |                 |-- Analytics Service ⇄ [Message Broker (SQS)]
      |                                       ⇄ [Database]
      └────────── Observability (Logs & Metrics: CloudWatch)
```

## 3. Các Microservice
### 3.1. Sales Service
- **Chức năng**: Quản lý giao dịch bán hàng; ghi nhận đơn bán, tự động giảm tồn kho sản phẩm, tính tổng giá trị đơn hàng; phát sự kiện bán hàng lên Message Broker.
- **Giao diện API**:
  - `POST /sales` (body: `{ productId, staffId, quantity }`) → Tạo đơn mới, trả về `201 { id, product, staff, quantity, total, soldAt }`
  - `GET /sales` → Lấy danh sách tất cả đơn hàng (có relation product & staff)
  - `GET /sales/:id` → Lấy chi tiết 1 đơn hàng theo ID
- **Luồng sự kiện**: On new sale → gửi message `{ event: 'sale.created', data: savedSale }` lên SQS (producer `src/sales/sqs.producer.ts`).
- **Dữ liệu lưu**: Bảng `sale` (file `src/sales/sale.entity.ts`) gồm: `id`, `product` (relation), `staff` (relation), `quantity`, `total`, `soldAt`.
- **Tính năng đặc biệt**: Sử dụng **DB transaction** và **pessimistic lock** để đảm bảo tính toàn vẹn khi giảm tồn kho đồng thời.

### 3.2. Product Service
- **Chức năng**: Quản lý sản phẩm (tên, giá, tồn kho). Chỉ Admin mới được phép tạo/sửa/xóa sản phẩm.
- **Giao diện API**:
  - `POST /products` (body: `{ name, price, stock }`, Auth: Admin) → Tạo sản phẩm mới
  - `PUT /products/:id` (body: `{ name, price, stock }`, Auth: Admin) → Cập nhật sản phẩm
  - `DELETE /products/:id` (Auth: Admin) → Xóa sản phẩm
  - `GET /products` (Auth: JWT) → Lấy danh sách sản phẩm
  - `GET /products/:id` (Auth: JWT) → Lấy chi tiết 1 sản phẩm
- **Dữ liệu lưu**: Bảng `product` (file `src/products/product.entity.ts`) gồm: `id`, `name`, `price`, `stock`.
- **Phân quyền**: Sử dụng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('admin')` để bảo vệ các API thay đổi dữ liệu.

### 3.3. Analytics Service
- **Chức năng**: Phân tích doanh thu, tổng hợp KPI, tạo báo cáo theo thời gian; dự báo xu hướng doanh thu bằng mô hình Time-series.
- **Luồng xử lý**:
  - Consumer SQS (`src/analytics/sqs.consumer.ts`) đọc sự kiện `sale.created` từ Sales Service.
  - Tính toán/tổng hợp theo ngày/tháng/năm, ghi kết quả vào `analytics-result.entity.ts`.
  - Cung cấp API báo cáo (`analytics.controller.ts`) và dự báo (`forecast.controller.ts`).
- **Giao diện API**:
  - `GET /analytics/sales-summary` → Tóm tắt doanh số (tổng doanh thu, số đơn, AOV)
  - `GET /analytics/top-products` → Top sản phẩm bán chạy
  - `GET /analytics/recent-sales` → Đơn hàng gần đây
  - `GET /analytics/summary` → Dashboard tổng quan (cho frontend)
  - `GET /analytics/revenue/day?days=30&start=YYYY-MM-DD` → Doanh thu theo ngày
  - `GET /analytics/revenue/month?year=2025` → Doanh thu theo tháng
  - `GET /analytics/revenue/year?years=3` → Doanh thu theo năm
  - `GET /analytics/forecast` hoặc `GET /analytics/predict?days=7` → Dự báo doanh thu n ngày tới
- **Kết quả**: KPI theo ngày/tuần/tháng/năm, top sản phẩm, tăng trưởng, dự báo ngắn hạn (7-30 ngày).

### 3.4. User Service
- **Chức năng**: Quản lý người dùng, đăng ký, đăng nhập, xác thực JWT, và phân quyền theo vai trò (Admin/Analyst/Viewer).
- **Giao diện API**:
  - `POST /auth/login` (body: `{ username, password }`) → Đăng nhập, trả về `{ access_token, user: { id, username, role } }`
  - `POST /auth/register` (body: `{ username, password, role? }`) → Đăng ký tài khoản mới
  - `POST /users` (body: `{ username, password, role? }`, Auth: Admin) → Tạo user (Admin only)
  - `PUT /users/:id` (body: `{ username?, password?, role? }`, Auth: Admin) → Cập nhật user
  - `DELETE /users/:id` (Auth: Admin) → Xóa user
  - `GET /users` → Lấy danh sách user
  - `GET /users/:id` → Lấy chi tiết 1 user
- **Bảo mật**: 
  - Xác thực: `auth.module.ts`, `jwt.strategy.ts` (Passport JWT)
  - Phân quyền: `jwt-auth.guard.ts`, `roles.guard.ts`, `roles.decorator.ts`
  - Mật khẩu: Hash bằng bcrypt trước khi lưu DB
- **Vai trò**: `admin` (toàn quyền), `analyst` (xem analytics), `viewer` (chỉ đọc).

## 4. Thành phần hệ thống
### 4.1. Frontend (Vite + React + Tailwind)
- **Thư mục**: `frontend/`
- **Màn hình chính**: `Dashboard.jsx`, `Analytics.jsx`, `Products.jsx`, `Sales.jsx`, `Users.jsx`, `Login.jsx`.
- **Thiết kế UI**: Component thư viện trong `src/components/ui/*`, `theme-provider.tsx` hỗ trợ theme.
- **Routing**: `router/AppRouter.jsx`, bảo vệ route qua `ProtectedRoute.jsx` (dùng JWT).

### 4.2. Backend (NestJS)
- **Thư mục**: `retail-backend/`
- **Module chính**: `sales`, `products`, `analytics`, `auth`, `observability`.
- **Observability**: `observability/cloudwatch-logger.service.ts`, `cloudwatch-metrics.service.ts`, `logging.interceptor.ts`.
- **Testing**: `test/app.e2e-spec.ts`, `sales.service.spec.ts`.

### 4.3. Message Broker
- **Công nghệ**: AWS SQS.
- **Producer**: `src/sales/sqs.producer.ts`.
- **Consumer**: `src/analytics/sqs.consumer.ts`.
- **Mục tiêu**: Decouple giữa Sales và Analytics; đảm bảo xử lý bất đồng bộ, chống mất dữ liệu.

### 4.4. Database
- **Kiến nghị**: PostgreSQL/MySQL (OLTP) cho services; có thể bổ sung Redis cho cache.
- **Lược đồ mẫu**:
  - `sale(id, product_id, staff_id, quantity, total_price, sold_at)` — quan hệ: `product_id → product.id`, `staff_id → user.id`
  - `product(id, sku, name, category, price, stock)` — cần index trên `category`, `stock`
  - `user(id, email, password_hash, role)` — role: Admin/Analyst/Viewer
  - `analytics_result(id, period, total_revenue, growth_rate, top_products, created_at)`

### 4.5. CI/CD
- **Pipeline đề xuất**:
  - Build & test frontend/backend.
  - Lint theo `eslint.config.mjs` (backend) và ESLint (frontend).
  - Container hóa mỗi service; đẩy image lên registry.
  - Triển khai lên môi trường (Dev/Staging/Prod) bằng IaC (Terraform/CDK) hoặc GitHub Actions.

### 4.6. Observability
- **Logs**: Gửi log lên CloudWatch (service `cloudwatch-logger.service.ts`).
- **Metrics**: Custom metrics cho request count, latency (`cloudwatch-metrics.service.ts`).
- **Tracing**: Có thể bổ sung OpenTelemetry.
- **Dashboards**: CloudWatch dashboards: SLA, throughput, lỗi theo service.

## 5. Luồng dữ liệu chi tiết
1. Người dùng thao tác trên Frontend → gọi API qua JWT.
2. Tạo đơn bán hàng → Sales Service tạo bản ghi `sale`, gửi message lên SQS.
3. Analytics Service consume message, tổng hợp theo period (ngày/tuần/tháng), ghi `analytics_result`.
4. Frontend gọi `analytics.controller`/`forecast.controller` để hiển thị biểu đồ.

## 6. Phân tích doanh thu & Báo cáo trực quan
- **Chỉ số chính**: Tổng doanh thu, số đơn, AOV, tăng trưởng %, top SKU, top category.
- **Biểu đồ**: Time-series (doanh thu theo ngày), Bar chart (top sản phẩm), Pie (phân bổ theo danh mục), KPI cards.
- **Bộ lọc**: Khoảng thời gian, danh mục, SKU.

## 7. Dự đoán xu hướng
- **Phương pháp**: **Linear Regression** (Hồi quy tuyến tính đơn giản) trên time-series doanh thu theo ngày.
- **Công thức**: `y = a + bx` trong đó:
  - `x`: chỉ số ngày (0, 1, 2, ...)
  - `y`: doanh thu ngày đó
  - `a`, `b`: hệ số tính bằng phương pháp bình phương tối thiểu (Least Squares)
- **Pipeline thực tế**:
  1. Query dữ liệu: `SELECT DATE(sold_at), SUM(total_price) FROM sales GROUP BY DATE(sold_at)`
  2. Kiểm tra: Cần ít nhất 2 ngày dữ liệu lịch sử
  3. Tính toán: Áp dụng công thức Linear Regression để tìm `a`, `b`
  4. Dự báo: Tính `predicted_revenue = a + b * (n + i)` cho i = 1..days (mặc định 7 ngày)
  5. Trả về: Mảng `{ day, predicted_revenue }`
- **Đánh giá**: Hiện tại chưa có validation set. Đề xuất: RMSE/MAE trên test set 20% cuối, so sánh với baseline (mean/median revenue).

## 8. Bảo mật & Phân quyền
- **Xác thực**: JWT; refresh token (khuyến nghị).
- **Phân quyền**: Role-based (Admin/Analyst/Viewer) qua `roles.decorator.ts` và `roles.guard.ts`.
- **An toàn**: Hash mật khẩu, TLS, CORS, rate limiting.

## 9. Triển khai
- **Môi trường hiện tại**: Development mode với `npm run start:dev` (backend) và `npm run dev` (frontend). Chưa container hóa.
- **Đề xuất Production**: 
  - Container hóa: Tạo `Dockerfile` cho từng service, `docker-compose.yml` cho orchestration local.
  - Cloud: Triển khai lên AWS ECS/EKS (container) hoặc EC2 (VM).
- **Biến môi trường cần thiết**:
  - Database: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
  - AWS: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SQS_QUEUE_URL`
  - Auth: `JWT_SECRET`, `JWT_EXPIRATION`
  - CloudWatch: `CW_LOG_GROUP`, `CW_NAMESPACE`
- **Quy trình khởi tạo dữ liệu (Seeding)**:
  1. Tạo sản phẩm và user thủ công qua API (POST `/products`, POST `/auth/register`)
  2. Chạy `npm run seed:sales` (chạy `scripts/seed-sales.ts`) → Tạo 7 đơn hàng cho 7 ngày gần nhất
  3. Chạy `npm run seed:test` (chạy `scripts/seed-test-periods.ts`) → Tạo 10 đơn (tháng trước + năm trước) để test analytics theo month/year
- **Lưu ý**: Seeding scripts yêu cầu đã có sẵn ít nhất 1 user và 1 product trong DB.

## 10. Kế hoạch phát triển tiếp
- Bổ sung tracing (OTel), dashboard tổng hợp.
- Tối ưu truy vấn và index DB.
- A/B testing cho mô hình dự báo.
- Tối ưu UI/UX, thêm bộ lọc nâng cao.

## 11. Phụ lục
- **Repo frontend**: `frontend/` (Vite + React + Tailwind)
- **Repo backend**: `retail-backend/` (NestJS, SQS, CloudWatch)
- **Cách xuất báo cáo sang Word**:
  1. Mở file này trong VS Code.
  2. Copy toàn bộ nội dung.
  3. Dán vào Microsoft Word.
  4. Chỉnh sửa template (bìa, mục lục, header/footer) theo yêu cầu.
