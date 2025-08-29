import {
  IsEmail,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentDto {
  @IsString()
  name_file: string;

  @IsString()
  s3_name: string;
}

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
