import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class CreateProcessDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsEmail()
  email: string;
}
