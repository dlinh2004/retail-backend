import { Injectable } from '@nestjs/common';
import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';
import { ConfigService } from '@nestjs/config';

export interface MetricData {
  metricName: string;
  value: number;
  unit?: StandardUnit;
  dimensions?: Array<{ Name: string; Value: string }>;
}

@Injectable()
export class CloudWatchMetricsService {
  private client: CloudWatchClient;
  private namespace: string;

  constructor(private configService: ConfigService) {
    this.namespace = this.configService.get<string>('CLOUDWATCH_NAMESPACE') || 'RetailBackend';
    
    const enableCloudWatch = this.configService.get<string>('ENABLE_CLOUDWATCH') !== 'false';
    
    if (enableCloudWatch) {
      this.client = new CloudWatchClient({
        region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
        credentials: {
          accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
          secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
        },
      });
    }
  }

  async putMetric(data: MetricData) {
      if (!this.client) return;
    
    try {
      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: [
          {
            MetricName: data.metricName,
            Value: data.value,
            Unit: data.unit || StandardUnit.Count,
            Timestamp: new Date(),
            Dimensions: data.dimensions || [],
          },
        ],
      });

      await this.client.send(command);
      console.log(`Metric sent: ${data.metricName} = ${data.value}`);
    } catch (error) {
      console.error('Error sending metric to CloudWatch:', error);
    }
  }

  // Helper methods for common metrics
  async recordAPILatency(endpoint: string, latency: number) {
    await this.putMetric({
      metricName: 'APILatency',
      value: latency,
      unit: StandardUnit.Milliseconds,
      dimensions: [
        { Name: 'Endpoint', Value: endpoint },
      ],
    });
  }

  async recordAPIError(endpoint: string, errorType: string) {
    await this.putMetric({
      metricName: 'APIError',
      value: 1,
      unit: StandardUnit.Count,
      dimensions: [
        { Name: 'Endpoint', Value: endpoint },
        { Name: 'ErrorType', Value: errorType },
      ],
    });
  }

  async recordAPIRequest(endpoint: string, method: string, statusCode: number) {
    await this.putMetric({
      metricName: 'APIRequest',
      value: 1,
      unit: StandardUnit.Count,
      dimensions: [
        { Name: 'Endpoint', Value: endpoint },
        { Name: 'Method', Value: method },
        { Name: 'StatusCode', Value: statusCode.toString() },
      ],
    });
  }

  async recordDatabaseQuery(queryType: string, duration: number) {
    await this.putMetric({
      metricName: 'DatabaseQueryDuration',
      value: duration,
      unit: StandardUnit.Milliseconds,
      dimensions: [
        { Name: 'QueryType', Value: queryType },
      ],
    });
  }

  async recordBusinessMetric(metricName: string, value: number, dimensions?: Record<string, string>) {
    const dims = dimensions 
      ? Object.entries(dimensions).map(([k, v]) => ({ Name: k, Value: v }))
      : [];

    await this.putMetric({
      metricName,
      value,
      unit: StandardUnit.Count,
      dimensions: dims,
    });
  }
}
