import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';
import { ProcessModule } from '../process/process.module';
import { R2Service } from '../services/r2.service';
@Module({
  imports: [ConfigModule, ProcessModule],
  controllers: [MailController],
  providers: [MailService, R2Service],
  exports: [MailService],
})
export class MailModule {}
