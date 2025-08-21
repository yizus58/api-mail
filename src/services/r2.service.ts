import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  R2Config,
  FileUploadResponse,
  FileExistsResponse,
} from '../interfaces/r2-config.interface';
import { Readable } from 'stream';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private r2Client: S3Client;
  private readonly config: R2Config;

  constructor(private configService: ConfigService) {
    this.config = {
      bucketRegion: this.configService.get<string>('R2_BUCKET_REGION') || '',
      accountId: this.configService.get<string>('R2_ACCOUNT_ID') || '',
      bucketAccessKey:
        this.configService.get<string>('R2_BUCKET_ACCESS_KEY') || '',
      bucketSecretKey:
        this.configService.get<string>('R2_BUCKET_SECRET_KEY') || '',
      bucketName: this.configService.get<string>('R2_BUCKET_NAME') || '',
    };

    this.validateConfig();
    this.initializeR2Client();
  }

  private validateConfig(): void {
    const requiredFields = [
      'bucketRegion',
      'accountId',
      'bucketAccessKey',
      'bucketSecretKey',
      'bucketName',
    ];

    for (const field of requiredFields) {
      if (!this.config[field as keyof R2Config]) {
        throw new InternalServerErrorException(
          `Missing required R2 configuration: ${field}`,
        );
      }
    }
  }

  private initializeR2Client(): void {
    this.r2Client = new S3Client({
      region: this.config.bucketRegion,
      endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.bucketAccessKey,
        secretAccessKey: this.config.bucketSecretKey,
      },
      forcePathStyle: true,
    });
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    if (!fileName) {
      throw new BadRequestException('Filename is required');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileName,
      });

      const response = await this.r2Client.send(command);

      if (!response.Body) {
        throw new InternalServerErrorException(
          `No se pudo obtener el contenido del archivo ${fileName}`,
        );
      }

      // Convert stream to buffer for Node.js environment
      const chunks: Buffer[] = [];
      const stream = response.Body as Readable;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log(`File "${fileName}" downloaded successfully`);
          resolve(buffer);
        });

        stream.on('error', (error) => {
          this.logger.error(`Error reading stream: ${error.message}`);
          reject(
            new InternalServerErrorException(
              `Error al leer el stream: ${error.message}`,
            ),
          );
        });
      });
    } catch (error) {
      this.logger.error(`Error downloading file from S3: ${error.message}`);
      throw new InternalServerErrorException(
        `No se pudo descargar el archivo: ${error.message}`,
      );
    }
  }

  async uploadFile(
    buffer: Buffer,
    contentType: string,
    fileName: string,
  ): Promise<FileUploadResponse> {
    if (!buffer || !contentType || !fileName) {
      throw new BadRequestException(
        'Buffer, contentType, and fileName are required',
      );
    }

    // Check if file already exists
    await this.getFile(fileName);

    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      });

      await this.r2Client.send(command);

      this.logger.log(`File "${fileName}" uploaded successfully`);
      return { Key: fileName };
    } catch (error) {
      this.logger.error(`Error uploading file "${fileName}": ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }
  }

  async getFile(filename: string): Promise<FileExistsResponse | void> {
    if (!filename) {
      throw new BadRequestException('Filename is required');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: filename,
      });

      await this.r2Client.send(command);

      this.logger.log(`File "${filename}" already exists in the bucket.`);
      return {
        key: filename,
        exists: true,
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        this.logger.log(
          `File "${filename}" does not exist. Proceeding with upload.`,
        );
        return;
      } else {
        this.logger.warn(`Error checking file existence: ${error.message}`);
        throw new InternalServerErrorException(
          `Failed to check file existence: ${error.message}`,
        );
      }
    }
  }

  async deleteFile(filename: string): Promise<any> {
    if (!filename) {
      throw new BadRequestException('Filename is required for deletion');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: filename,
      });

      const result = await this.r2Client.send(command);
      this.logger.log(`File "${filename}" deleted successfully`);
      return result;
    } catch (error: any) {
      this.logger.error('Error deleting file from Cloudflare R2:', error);
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }
}
