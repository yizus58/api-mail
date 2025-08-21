import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailDto } from './dto/email.dto';
import { ProcessService } from '../process/process.service';
import { R2Service } from '../services/r2.service';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly processService: ProcessService,
    private readonly r2Service: R2Service,
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
        console.error(error);
        return false;
      }
    });
    return transporter;
  }

  async sendMail(
    dto: EmailDto,
    opportunity?: number,
  ) {
    if (!dto) {
      throw new Error('Los datos del email son requeridos');
    }

    const { recipients, subject, html, text, name_file, s3_name } = dto;

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
    };

    if (text) {
      options.text = text;
    }

    if (name_file && s3_name) {
      try {
        const fileBuffer = await this.r2Service.downloadFile(s3_name);

        options.attachments = [
          {
            filename: name_file,
            content: fileBuffer,
          },
        ];
      } catch (error) {
        console.error(`Error procesando archivo adjunto: ${error.message}`);
        throw new Error(
          `No se pudo procesar el archivo adjunto: ${error.message}`,
        );
      }
    }

    try {
      const response = await transport.sendMail(options);
      const data = {
        mailsSuccess: response.accepted,
        mailsError: response.rejected,
        messageId: response.messageId,
      };
      const saveMongo = await this.processService.insertDetails(data);
      if (saveMongo && s3_name) {
        await this.r2Service.deleteFile(s3_name);
      }
    } catch (error) {
      console.error('Error al enviar el correo, info: ', error);
      throw error;
    }
  }
}
