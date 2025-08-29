import {
  Controller,
  Body,
  HttpException,
  HttpStatus,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { RabbitMQService, QueueMessage } from './rabbitmq.service';
import { MailService } from '../mail/mail.service';

export interface AttachmentParams {
  name_file: string;
  s3_name: string;
}

export interface MailParams {
  recipients: string[];
  subject: string;
  html: string;
  attachments?: AttachmentParams[];
}

export interface PublishMessageDto {
  queue?: string;
  message?: QueueMessage;
}

@Controller()
export class RabbitMQController implements OnApplicationBootstrap {
  private readonly maxRetryCount = 4;

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly mailService: MailService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.startConsumerInternal();
    } catch (error) {
      console.error('Failed to start RabbitMQ consumer on bootstrap:', error);
    }
  }

  async startConsumer(@Body() body?: { queue?: string }) {
    return this.startConsumerInternal(body?.queue);
  }

  private async startConsumerInternal(queueName?: string) {
    try {
      const queue = queueName || 'email_queue';

      await this.rabbitMQService.connect(queue);

      await this.rabbitMQService.consumeMessages(
        queue,
        async (message: QueueMessage) => {
          if (message.type === 'email_notification') {
            const currentRetryCount = message.retryCount || 0;

            try {
              const recipients = Array.isArray(message.data.recipients)
                ? message.data.recipients
                : [message.data.recipients];

              const params: MailParams = {
                recipients: recipients,
                subject: message.data.subject,
                html: message.data.html,
              };

              if (message.data.attachments) {
                console.log('ATTACHMENTS', message.data.attachments);

                // Si es un array, usar tal como está
                if (Array.isArray(message.data.attachments)) {
                  params.attachments = message.data.attachments;
                } 
                // Si es un objeto único, convertirlo a array
                else if (message.data.attachments.name_file && message.data.attachments.s3_name) {
                  params.attachments = [
                    {
                      name_file: message.data.attachments.name_file,
                      s3_name: message.data.attachments.s3_name
                    }
                  ];
                }
              }

              await this.mailService.sendMail(params, currentRetryCount);
            } catch (error) {
              console.error(
                `Failed to send email on attempt ${currentRetryCount + 1}:`,
                error,
              );

              if (currentRetryCount >= this.maxRetryCount) {
                console.error(
                  `Maximum retry count (${this.maxRetryCount}) exceeded. Moving to final dead letter queue.`,
                );

                try {
                  await this.rabbitMQService.publishToFinalDLQ({
                    ...message,
                    retryCount: currentRetryCount,
                    originalQueue: queue,
                    lastError: error.message,
                  });
                } catch (dlqError) {
                  console.error(
                    'Failed to publish to final dead letter queue:',
                    dlqError,
                  );
                  throw dlqError;
                }
              } else {
                try {
                  await this.rabbitMQService.publishToDeadLetterQueue({
                    ...message,
                    retryCount: currentRetryCount + 1,
                    originalQueue: queue,
                  });
                } catch (retryError) {
                  console.error(
                    'Failed to publish to retry queue:',
                    retryError,
                  );
                  throw retryError;
                }
              }
            }
          }
        },
      );

      return {
        success: true,
        message: `Consumer started successfully for queue: ${queue}`,
        queue: queue,
      };
    } catch (error) {
      console.error('Error in RabbitMQ subscriber:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Error starting RabbitMQ consumer',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async closeConnection() {
    try {
      await this.rabbitMQService.close();
      return {
        success: true,
        message: 'RabbitMQ connection closed successfully',
      };
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Error closing RabbitMQ connection',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
