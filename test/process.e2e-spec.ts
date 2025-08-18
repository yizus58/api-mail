import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProcessModule } from '../src/process/process.module';
import { MailModule } from '../src/mail/mail.module';
import { Process } from '../src/process/entities/process.entity';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('ProcessController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  beforeAll(async () => {
    if (fs.existsSync('.env.test')) {
      dotenv.config({ path: '.env.test' });
    }

    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'mongodb',
            url: mongoUri,
            entities: [Process],
            synchronize: true,
            dropSchema: true,
            retryAttempts: 1,
            retryDelay: 500,
          }),
        }),
        ProcessModule,
        MailModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(async () => {
    const processRepository = app.get(getRepositoryToken(Process));
    await processRepository.clear();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('/POST Save Process By Info Send Email', async () => {
    const createProcessDto = {
      mailsSuccess: ['test@example.com', 'success@example.com'],
      mailsError: ['error@example.com'],
      messageId: 'test-message-id-' + Date.now(),
    };

    const response = await request(app.getHttpServer())
      .post('/process')
      .send(createProcessDto)
      .expect(201);

    expect(response.status).toBe(201);
    expect(Array.isArray(response.body.data.items)).toBe(true);
  });
});
