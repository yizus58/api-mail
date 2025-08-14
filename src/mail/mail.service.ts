import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailDto } from './dto/email.dto';
import { ProcessService } from '../process/process.service';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly processService: ProcessService,
  ) {}

  emailTransport() {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
    transporter.verify(function (error, success) {
      if (error) {
        console.log(error);
      } else {
        console.log('Server is ready to take our messages', success);
      }
    });
    return transporter;
  }

  async sendMail(dto: EmailDto) {
    if (!dto) {
      throw new Error('Los datos del email son requeridos');
    }

    const { recipients, subject, html, text } = dto;

    if (!recipients || !subject || !html) {
      throw new Error('Los campos recipients, subject y html son requeridos');
    }

    const transport = this.emailTransport();
    const emailUser = this.configService.get<string>('ADMIN_EMAIL');
    const appName =
      this.configService.get<string>('APP_NAME') || 'Sistema de Parqueadero';

    const options: nodemailer.SendMailOptions = {
      from: `"${appName}" <${emailUser}>`,
      to: recipients,
      subject: subject,
      html: html,
      //replyTo: emailUser,
    };

    if (text) {
      options.text = text;
    }

    try {
      const response = await transport.sendMail(options);
      const data = {
        mailsSuccess: response.accepted,
        mailsError: response.rejected,
        messageId: response.messageId,
      };
      await this.processService.insertDetails(data);
    } catch (error) {
      console.log('Error al enviar el correo, info: ', error);
      throw error;
    }
  }
}
