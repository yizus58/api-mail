import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailDto } from './dto/email.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async sendMail(@Body() dto: EmailDto) {
    if (!dto) {
      throw new Error('El cuerpo de la petición está vacío');
    }

    await this.mailService.sendMail(dto);
    return { result: true, message: 'Correo enviado correctamente' };
  }
}
