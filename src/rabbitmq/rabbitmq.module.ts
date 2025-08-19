import { Module } from '@nestjs/common';
import { RabbitMQController } from './rabbitmq.controller';
import { RabbitMQService } from './rabbitmq.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [RabbitMQController],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
