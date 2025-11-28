# Observability với AWS CloudWatch - Hướng dẫn

## Tổng quan

Dự án đã được tích hợp với AWS CloudWatch để theo dõi và giám sát ứng dụng thông qua 3 trụ cột của Observability:

### 1. **Logs (CloudWatch Logs)**
- Tự động ghi lại tất cả HTTP requests/responses
- Log errors với stack traces
- Log business logic events
- Tự động sanitize dữ liệu nhạy cảm (password, token, etc.)

### 2. **Metrics (CloudWatch Metrics)**
- API latency (thời gian phản hồi)
- API request counts theo endpoint, method, status code
- Error counts theo loại lỗi
- Business metrics tùy chỉnh (ví dụ: số lượng sales được tạo)

### 3. **Traces** (Có thể mở rộng với X-Ray)
- Hiện tại: Request/Response tracking
- Có thể tích hợp AWS X-Ray để distributed tracing

---

## Cấu hình AWS

### Bước 1: Tạo CloudWatch Log Group

```bash
# Sử dụng AWS CLI
aws logs create-log-group --log-group-name /aws/retail-backend --region ap-southeast-2

# Hoặc tạo qua AWS Console:
# 1. Vào CloudWatch Console
# 2. Chọn "Log groups" 
# 3. Click "Create log group"
# 4. Nhập tên: /aws/retail-backend
```

### Bước 2: Cấu hình IAM Permissions

Đảm bảo IAM user/role có các quyền sau:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/retail-backend:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

### Bước 3: Cấu hình biến môi trường

File `.env` đã được cập nhật với các biến sau:

```env
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

CLOUDWATCH_LOG_GROUP=/aws/retail-backend
CLOUDWATCH_NAMESPACE=RetailBackend
NODE_ENV=development
```

---

## Cách sử dụng

### 1. Logging tự động

Tất cả HTTP requests được log tự động nhờ `LoggingInterceptor`:

```typescript
// Không cần làm gì thêm, tất cả endpoints đều được log tự động
@Get('/users')
getUsers() {
  return this.usersService.findAll();
}
```

### 2. Custom Logging

Sử dụng `CloudWatchLoggerService` trong bất kỳ service nào:

```typescript
import { CloudWatchLoggerService } from '../observability/cloudwatch-logger.service';

@Injectable()
export class YourService {
  constructor(private logger: CloudWatchLoggerService) {}

  someMethod() {
    this.logger.log('Processing data...', 'YourService');
    this.logger.error('An error occurred', 'stack trace', 'YourService');
    this.logger.warn('Warning message', 'YourService');
    this.logger.debug('Debug info', 'YourService');
  }
}
```

### 3. Custom Metrics

Sử dụng `CloudWatchMetricsService`:

```typescript
import { CloudWatchMetricsService } from '../observability/cloudwatch-metrics.service';

@Injectable()
export class YourService {
  constructor(private metrics: CloudWatchMetricsService) {}

  async processOrder(orderId: number) {
    // Record business metric
    await this.metrics.recordBusinessMetric('OrderProcessed', 1, {
      OrderId: orderId.toString(),
      Status: 'success',
    });

    // Record custom metric with unit
    await this.metrics.putMetric({
      metricName: 'OrderValue',
      value: 150.50,
      unit: StandardUnit.None,
      dimensions: [
        { Name: 'Currency', Value: 'USD' }
      ],
    });
  }
}
```

### 4. Các Metrics có sẵn

```typescript
// API Latency
await this.metrics.recordAPILatency('/api/users', 250);

// API Error
await this.metrics.recordAPIError('/api/users', 'ValidationError');

// API Request
await this.metrics.recordAPIRequest('/api/users', 'GET', 200);

// Database Query Duration
await this.metrics.recordDatabaseQuery('SELECT', 45);

// Business Metrics
await this.metrics.recordBusinessMetric('SaleCompleted', 1, {
  ProductId: '123',
  Amount: '99.99'
});
```

---

## Xem Logs và Metrics trên AWS Console

### CloudWatch Logs:

1. Vào AWS Console → CloudWatch
2. Chọn "Log groups" 
3. Tìm `/aws/retail-backend`
4. Click vào log stream để xem logs
5. Sử dụng CloudWatch Insights để query logs:

```sql
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

### CloudWatch Metrics:

1. Vào AWS Console → CloudWatch
2. Chọn "Metrics" → "All metrics"
3. Tìm namespace "RetailBackend"
4. Chọn metrics để xem graphs
5. Tạo Dashboard để theo dõi tổng hợp

### Tạo Alarms:

```bash
# Ví dụ: Alarm khi error rate cao
aws cloudwatch put-metric-alarm \
  --alarm-name "HighErrorRate" \
  --alarm-description "Alert when error rate is high" \
  --metric-name "APIError" \
  --namespace "RetailBackend" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 1
```

---

## Kiến trúc Observability

```
┌─────────────────┐
│   NestJS App    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐  ┌─────────┐
│Logs │  │ Metrics │
└──┬──┘  └────┬────┘
   │          │
   │          │
   ▼          ▼
┌──────────────────┐
│  AWS CloudWatch  │
├──────────────────┤
│ • Log Groups     │
│ • Metrics        │
│ • Dashboards     │
│ • Alarms         │
└──────────────────┘
```

---

## Best Practices

### 1. Log Levels
- `ERROR`: Lỗi nghiêm trọng cần xử lý ngay
- `WARN`: Cảnh báo, cần theo dõi
- `INFO`: Thông tin quan trọng về flow
- `DEBUG`: Thông tin chi tiết cho debugging
- `VERBOSE`: Thông tin rất chi tiết

### 2. Metric Naming
- Sử dụng PascalCase: `APILatency`, `OrderProcessed`
- Rõ ràng và mô tả: `DatabaseQueryDuration` thay vì `DBTime`
- Nhóm theo namespace: `RetailBackend/Sales`, `RetailBackend/Auth`

### 3. Dimensions
- Thêm context cho metrics: endpoint, method, status
- Tối đa 10 dimensions per metric
- Sử dụng dimensions để filter và aggregate

### 4. Cost Optimization
- Log buffer: Logs được gom nhóm mỗi 5 giây trước khi gửi
- Tránh log dữ liệu quá lớn
- Sử dụng log level phù hợp (ít dùng DEBUG/VERBOSE ở production)
- Set retention policy cho log groups (7-30 days)

---

## Monitoring Dashboard (Ví dụ)

Tạo dashboard CloudWatch để theo dõi:

```yaml
Metrics cần theo dõi:
  - API Latency (p50, p95, p99)
  - Error Rate (errors/minute)
  - Request Count (requests/minute)
  - Success Rate (%)
  - Database Query Duration
  - Business Metrics (Sales/hour, Revenue, etc.)

Alarms nên tạo:
  - High Error Rate (> 5% requests)
  - High Latency (p95 > 1000ms)
  - Low Success Rate (< 95%)
  - Service Unavailable (no requests in 5 minutes)
```

---

## Troubleshooting

### Logs không xuất hiện trên CloudWatch:

1. Kiểm tra AWS credentials trong `.env`
2. Kiểm tra IAM permissions
3. Kiểm tra log group đã được tạo chưa
4. Xem console logs để check errors
5. Kiểm tra region phải khớp

### Metrics không xuất hiện:

1. Đợi 5-10 phút (metrics có độ trễ)
2. Kiểm tra namespace và metric name
3. Kiểm tra dimensions filter
4. Verify IAM permissions cho `cloudwatch:PutMetricData`

### Performance Issues:

1. Tăng flush interval trong logger (hiện tại 5s)
2. Giảm số lượng metrics được gửi
3. Sử dụng sampling cho high-traffic endpoints
4. Batch metrics thay vì gửi từng cái

---

## Mở rộng

### 1. AWS X-Ray Integration (Distributed Tracing)
```bash
npm install aws-xray-sdk-core
```

### 2. CloudWatch Dashboard as Code
```bash
npm install @aws-cdk/aws-cloudwatch
```

### 3. Log Analysis với CloudWatch Insights
- Tạo saved queries
- Export logs sang S3
- Integration với Lambda for processing

### 4. APM Tools
- Kết hợp với Datadog, New Relic
- Grafana với CloudWatch datasource

---

## Kết luận

Observability đã được tích hợp đầy đủ vào ứng dụng với:
- ✅ Automatic request/response logging
- ✅ Custom business metrics
- ✅ Error tracking and alerting
- ✅ Performance monitoring
- ✅ AWS CloudWatch integration

Bây giờ bạn có thể:
1. Theo dõi real-time performance
2. Debug issues nhanh chóng với logs
3. Tạo dashboards và alerts
4. Phân tích patterns và trends
5. Proactive monitoring và incident response
