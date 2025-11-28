import { Injectable, LoggerService } from '@nestjs/common';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudWatchLoggerService implements LoggerService {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private sequenceToken: string | undefined;
  private logBuffer: Array<{ timestamp: number; message: string }> = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    this.logGroupName = this.configService.get<string>('CLOUDWATCH_LOG_GROUP') || '/aws/retail-backend';
    this.logStreamName = `${this.configService.get<string>('NODE_ENV') || 'development'}-${Date.now()}`;
    
    const enableCloudWatch = this.configService.get<string>('ENABLE_CLOUDWATCH') !== 'false';
    
    if (enableCloudWatch) {
      this.client = new CloudWatchLogsClient({
        region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
        credentials: {
          accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
          secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
        },
      });

      this.initializeLogStream();
      
      // Flush logs every 5 seconds
      this.flushInterval = setInterval(() => this.flushLogs(), 5000);
    } else {
      console.log('CloudWatch logging is disabled');
    }
  }

  private async initializeLogStream() {
    try {
      // Check if log stream exists
      const describeCommand = new DescribeLogStreamsCommand({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: this.logStreamName,
      });

      const { logStreams } = await this.client.send(describeCommand);
      
      if (!logStreams || logStreams.length === 0) {
        // Create log stream if it doesn't exist
        const createCommand = new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        });
        await this.client.send(createCommand);
        console.log(`Created CloudWatch log stream: ${this.logStreamName}`);
      } else {
        this.sequenceToken = logStreams[0].uploadSequenceToken;
      }
    } catch (error) {
      console.error('Error initializing CloudWatch log stream:', error);
    }
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0 || !this.client) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: logsToSend.map(log => ({
          timestamp: log.timestamp,
          message: log.message,
        })),
        sequenceToken: this.sequenceToken,
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error) {
      console.error('Error sending logs to CloudWatch:', error);
      // Don't add logs back to buffer to avoid infinite retry
    }
  }

  private addLog(level: string, message: any, context?: string) {
    const logMessage = typeof message === 'object' 
      ? JSON.stringify({ level, context, ...message, timestamp: new Date().toISOString() })
      : JSON.stringify({ level, context, message, timestamp: new Date().toISOString() });

    this.logBuffer.push({
      timestamp: Date.now(),
      message: logMessage,
    });

    // Also log to console for local development
    console.log(logMessage);
  }

  log(message: any, context?: string) {
    this.addLog('INFO', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.addLog('ERROR', { message, trace }, context);
  }

  warn(message: any, context?: string) {
    this.addLog('WARN', message, context);
  }

  debug(message: any, context?: string) {
    this.addLog('DEBUG', message, context);
  }

  verbose(message: any, context?: string) {
    this.addLog('VERBOSE', message, context);
  }

  async onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushLogs();
  }
}
