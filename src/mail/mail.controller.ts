import { Body, Controller, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmailDto } from './dto/email.dto';
import { MailService } from './mail.service';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @ApiResponse({ status: 201, description: 'Correo enviado correctamente' })
  async sendMail(@Body() dto: EmailDto) {
    if (!dto) {
      throw new Error('El cuerpo de la petición está vacío');
    }

    await this.mailService.sendMail(dto);
    return { result: true, message: 'Correo enviado correctamente' };
  }
}
