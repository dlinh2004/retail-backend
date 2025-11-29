# Hệ thống Phân tích Dữ liệu Bán lẻ (Retail Data Analytics System)

## 📋 Tổng quan

Hệ thống phân tích dữ liệu bán lẻ được xây dựng theo kiến trúc **Microservices + Event-driven**, cung cấp giải pháp toàn diện để thu thập, phân tích, trực quan hóa và dự đoán xu hướng bán hàng cho doanh nghiệp bán lẻ.

### Tính năng chính
- ✅ Thu thập dữ liệu bán hàng realtime
- 📊 Phân tích doanh thu theo ngày/tháng/năm
- 📈 Dashboard trực quan với KPI và biểu đồ
- 🔮 Dự đoán xu hướng doanh thu (Linear Regression)
- 🔐 Xác thực JWT và phân quyền RBAC (Admin/Analyst/Viewer)
- ⚡ Xử lý bất đồng bộ qua AWS SQS
- 📡 Observability với AWS CloudWatch

## 🏗️ Kiến trúc

```
[Frontend - React/Vite] ⇄ [Backend - NestJS Microservices]
                                |-- Sales Service
                                |-- Product Service
                                |-- User Service (Auth)
                                |-- Analytics Service ⇄ [AWS SQS]
                                              |
                                              ⇣
                                        [PostgreSQL]
                                              |
                                              ⇣
                                    [CloudWatch Logs/Metrics]
```

### Microservices
1. **Sales Service**: Quản lý đơn hàng, giảm tồn kho tự động, phát sự kiện lên SQS
2. **Product Service**: Quản lý sản phẩm (CRUD, chỉ Admin)
3. **Analytics Service**: Consumer SQS, tổng hợp KPI, dự báo doanh thu
4. **User Service**: Đăng ký/đăng nhập, JWT auth, phân quyền RBAC

## 🛠️ Tech Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts |
| **Backend** | NestJS, TypeScript, TypeORM |
| **Database** | PostgreSQL |
| **Message Broker** | AWS SQS |
| **Observability** | AWS CloudWatch (Logs + Metrics) |
| **Auth** | JWT, Passport, bcrypt |

## 📁 Cấu trúc dự án

```
cloudComputing/
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── pages/         # Dashboard, Analytics, Products, Sales, Users
│   │   ├── components/    # UI components (shadcn/ui)
│   │   ├── services/      # API client (axios)
│   │   └── context/       # AuthContext
│   └── package.json
│
├── retail-backend/        # NestJS
│   ├── src/
│   │   ├── sales/         # Sales Service + SQS Producer
│   │   ├── products/      # Product Service
│   │   ├── analytics/     # Analytics Service + SQS Consumer + Forecast
│   │   ├── auth/          # Auth (JWT Strategy, Guards)
│   │   ├── users/         # User Service
│   │   └── observability/ # CloudWatch Logger + Metrics
│   ├── scripts/
│   │   ├── seed-sales.ts         # Seed 7 ngày gần nhất
│   │   └── seed-test-periods.ts  # Seed tháng/năm trước
│   └── package.json
│
└── README.md             # File này
```

## ⚙️ Yêu cầu hệ thống

- **Node.js**: >= 18.x
- **PostgreSQL**: >= 14.x
- **npm** hoặc **yarn**
- **AWS Account**: Cần SQS queue và IAM credentials (cho CloudWatch + SQS)

## 🚀 Cài đặt và Chạy

### 1. Clone repository

```bash
git clone <repository-url>
cd cloudComputing
```

### 2. Cấu hình Database

Tạo database PostgreSQL:

```sql
CREATE DATABASE retaildb;
```

### 3. Setup Backend

```bash
cd retail-backend
npm install
```

Tạo file `.env` trong `retail-backend/` (xem mẫu tại `.env.example`):

```bash
cp .env.example .env
```

Sau đó, chỉnh sửa `.env` với thông tin thực tế của bạn:

```env
# Database (thay bằng credentials PostgreSQL của bạn)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password_here
DB_NAME=retaildb

# AWS (thay bằng AWS credentials của bạn)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account-id/queue-name

# JWT (tạo secret mạnh: openssl rand -hex 32)
JWT_SECRET=generate_strong_random_key_here
JWT_EXPIRATION=24h

# CloudWatch (tùy chỉnh tên group và namespace)
CW_LOG_GROUP=/aws/retail-backend
CW_NAMESPACE=RetailAnalytics

# App
PORT=3000
```

⚠️ **QUAN TRỌNG**: 
- KHÔNG push file `.env` lên Git (chỉ commit `.env.example`)
- Kiểm tra `.gitignore` có `.env` chưa
- Giữ bí mật tất cả credentials (password, keys, tokens)

Chạy backend:

```bash
npm run start:dev
```

Backend sẽ chạy tại: `http://localhost:3000`

### 4. Setup Frontend

```bash
cd frontend
npm install
```

Tạo file `.env` trong `frontend/` (nếu cần):

```env
VITE_API_URL=http://localhost:3000
```

Chạy frontend:

```bash
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

### 5. Khởi tạo dữ liệu (Seeding)

**Bước 1**: Đăng ký tài khoản Admin đầu tiên qua API hoặc Postman:

```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123",
  "role": "admin"
}
```

**Bước 2**: Tạo sản phẩm (cần JWT token từ bước 1):

```bash
POST http://localhost:3000/products
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "name": "Sản phẩm A",
  "price": 100000,
  "stock": 50
}
```

Tạo thêm 2-3 sản phẩm khác.

**Bước 3**: Seed dữ liệu bán hàng:

```bash
cd retail-backend

# Seed 7 ngày gần nhất
npx ts-node scripts/seed-sales.ts

# Seed dữ liệu tháng/năm trước (cho analytics)
npx ts-node scripts/seed-test-periods.ts
```

## 📊 API Endpoints chính

### Auth & Users
- `POST /auth/login` - Đăng nhập, trả về JWT
- `POST /auth/register` - Đăng ký tài khoản
- `GET /users` - Danh sách người dùng
- `POST /users` - Tạo user (Admin only)

### Products
- `GET /products` - Danh sách sản phẩm
- `POST /products` - Tạo sản phẩm (Admin only)
- `PUT /products/:id` - Cập nhật sản phẩm (Admin only)
- `DELETE /products/:id` - Xóa sản phẩm (Admin only)

### Sales
- `POST /sales` - Tạo đơn hàng mới (body: `{ productId, staffId, quantity }`)
- `GET /sales` - Danh sách đơn hàng
- `GET /sales/:id` - Chi tiết đơn hàng

### Analytics
- `GET /analytics/summary` - Tổng quan dashboard
- `GET /analytics/sales-summary` - Tóm tắt doanh số (revenue, orders, AOV)
- `GET /analytics/top-products` - Top sản phẩm bán chạy
- `GET /analytics/recent-sales` - Đơn hàng gần đây
- `GET /analytics/revenue/day?days=30&start=YYYY-MM-DD` - Doanh thu theo ngày
- `GET /analytics/revenue/month?year=2025` - Doanh thu theo tháng
- `GET /analytics/revenue/year?years=3` - Doanh thu theo năm
- `GET /analytics/forecast` - Dự báo 7 ngày tới
- `GET /analytics/predict?days=14` - Dự báo n ngày

## 🔐 Phân quyền (RBAC)

| Vai trò | Quyền |
|---------|-------|
| **Admin** | Toàn quyền: CRUD users, products, xem tất cả analytics |
| **Analyst** | Xem analytics, tạo đơn hàng, xem products (không sửa/xóa) |
| **Viewer** | Chỉ xem dashboard, không thay đổi dữ liệu |

## 🧪 Testing

### Backend
```bash
cd retail-backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend
```bash
cd frontend
npm run test
```

## 📈 Dự đoán xu hướng

Hệ thống sử dụng **Linear Regression** để dự báo doanh thu:

- **Công thức**: `y = a + bx` (y: doanh thu, x: chỉ số ngày)
- **Input**: Dữ liệu doanh thu lịch sử theo ngày (tối thiểu 2 ngày)
- **Output**: Dự báo n ngày tới (mặc định 7 ngày)
- **API**: `GET /analytics/forecast` hoặc `GET /analytics/predict?days=7`

## 🔍 Observability

### CloudWatch Logs
Tất cả request/response và business events được ghi vào CloudWatch Logs:
- Log group: `/aws/retail-backend`
- Log level: info, error, warn

### CloudWatch Metrics
Custom metrics được ghi realtime:
- `SaleCreated`: Số đơn hàng mới
- `http_request_duration_ms`: Latency của API
- Namespace: `RetailAnalytics`

Xem metrics tại: AWS Console → CloudWatch → Metrics → Custom Namespaces

## 🐛 Troubleshooting

### Backend không start được
- Kiểm tra PostgreSQL đã chạy: `pg_isready`
- Kiểm tra file `.env` có đầy đủ biến môi trường
- Xem logs: `npm run start:dev` sẽ hiển thị lỗi chi tiết

### Frontend không kết nối được Backend
- Kiểm tra Backend đang chạy tại `http://localhost:3000`
- Kiểm tra CORS trong `src/main.ts` (backend)
- Xóa cache: `Ctrl+Shift+R` trên trình duyệt

### SQS không hoạt động
- Kiểm tra `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SQS_QUEUE_URL` trong `.env`
- Kiểm tra IAM permissions: cần `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`
- Xem CloudWatch Logs để debug

### Seeding script lỗi "No products found"
- Chạy bước 1, 2 trước (tạo user + product thủ công qua API)
- Kiểm tra database đã có data: `SELECT * FROM product;`

## 📚 Tài liệu bổ sung

- [Báo cáo đồ án đầy đủ](./frontend/docs/bao-cao-do-an.md)
- [OBSERVABILITY.md](./retail-backend/OBSERVABILITY.md) - Hướng dẫn CloudWatch chi tiết

## 👥 Contributors

- Sinh viên: [Phạm Duy Linh và Cao Quốc Trực]
- Nhóm: [16]


## 📄 License

[Chọn license phù hợp, ví dụ: MIT]

---

**Phát triển bởi**: [Linh,Trực] - Năm 2025
