import { IsEmail, IsOptional, IsString } from 'class-validator';

export class EmailDto {
  @IsEmail({}, { each: true })
  recipients: string[];

  @IsString()
  subject: string;

  @IsString()
  html: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  name_file?: string;

  @IsOptional()
  s3_name?: string;
}
