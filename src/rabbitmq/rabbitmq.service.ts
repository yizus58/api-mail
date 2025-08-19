import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

export interface QueueMessage {
  type: string;
  data: {
    recipients: string | string[];
    subject: string;
    html: string;
    text?: string;
    [key: string]: any;
  };
  retryCount?: number;
  originalQueue?: string;
  failedAt?: Date;
  lastError?: string;
  finalFailure?: boolean;
}

interface RabbitConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private connection: RabbitConnection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly queueRetry = 'email_retry_queue';

  async connect(queueName?: string): Promise<void> {
    try {
      this.connection = (await amqp.connect(
        process.env.RABBITMQ_URL || 'amqp://localhost',
      )) as RabbitConnection;

      if (!this.connection) {
        throw new Error('Failed to establish RabbitMQ connection');
      }

      this.channel = await this.connection.createChannel();

      if (!this.channel) {
        throw new Error('Failed to create RabbitMQ channel');
      }

      const defaultQueueName =
        queueName || process.env.QUEUE_NAME || 'email_queue';

      const dlqFinalName = `${defaultQueueName}.dlq.final`;

      try {
        await this.channel.checkQueue(defaultQueueName);
      } catch (error) {
        await this.channel.assertQueue(dlqFinalName, {
          durable: true,
        });

        await this.channel.assertQueue(this.queueRetry, {
          durable: true,
          arguments: {
            'x-message-ttl': 60000,
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': defaultQueueName,
          },
        });

        await this.channel.assertQueue(defaultQueueName, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': defaultQueueName,
          },
        });
        console.log('Created queues DLQ Final:', error);
      }
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error);
      throw error;
    }
  }

  async sendToQueue(queueName: string, message: any): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    await this.channel.sendToQueue(queueName, messageBuffer, {
      persistent: true,
    });
  }

  async publishToDeadLetterQueue(message: QueueMessage): Promise<void> {
    await this.sendToQueue(this.queueRetry, message);
  }

  async publishToFinalDLQ(message: QueueMessage): Promise<void> {
    const queueName = process.env.QUEUE_NAME || 'email_queue';
    const dlqFinalName = `${queueName}.dlq.final`;
    await this.sendToQueue(dlqFinalName, {
      ...message,
      failedAt: new Date(),
      finalFailure: true,
    });
  }

  async consumeFromQueue(
    queueName: string,
    callback: (message: any) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel?.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }

  async consumeMessages(
    queueName: string,
    callback: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    await this.consumeFromQueue(queueName, callback);
  }

  async consumeFromFinalDLQ(
    callback: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    const queueName = process.env.QUEUE_NAME || 'email_queue';
    const dlqFinalName = `${queueName}.dlq.final`;
    await this.consumeFromQueue(dlqFinalName, callback);
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
