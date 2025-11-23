import { Injectable } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsProducer {
  private sqs: SQSClient;

  constructor() {
    this.sqs = new SQSClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async sendSaleEvent(data: any) {
    const params = {
      QueueUrl: process.env.SQS_QUEUE_URL!,
      MessageBody: JSON.stringify(data),
    };

    await this.sqs.send(new SendMessageCommand(params));
  }
}
