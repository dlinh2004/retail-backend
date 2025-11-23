import { Injectable, OnModuleInit } from '@nestjs/common';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsConsumer implements OnModuleInit {
  private sqs = new SQSClient({ region: process.env.AWS_REGION });

  async onModuleInit() {
    this.pollQueue();
  }

  async pollQueue() {
    while (true) {
      const params = {
        QueueUrl: process.env.SQS_QUEUE_URL,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 20,
      };

      const messages = await this.sqs.send(new ReceiveMessageCommand(params));

      if (messages.Messages) {
        for (const msg of messages.Messages) {
          if (!msg.Body) continue; // bỏ qua message trống
          const body = JSON.parse(msg.Body);

          console.log('Analytics received event:', body);

          await this.handleEvent(body);

          // Delete after processing
          await this.sqs.send(
            new DeleteMessageCommand({
              QueueUrl: process.env.SQS_QUEUE_URL,
              ReceiptHandle: msg.ReceiptHandle,
            }),
          );
        }
      }
    }
  }

  async handleEvent(event) {
    if (event.event === 'sale.created') {
      // TODO: xử lý — tính doanh thu, ghi log, cập nhật bảng analytics
      console.log('Process sale event:', event.data);
    }
  }
}
