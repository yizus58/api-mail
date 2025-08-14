import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessModule } from './process/process.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: process.env.MONGODB_URI,
      // host: process.env.MONGODB_HOST || 'localhost',
      // port: parseInt(process.env.MONGODB_PORT || '27017'),
      // database: process.env.DB_NAME || 'test',
      // username: process.env.DB_USERNAME,
      // password: process.env.DB_PASSWORD,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    MailModule,
    ProcessModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
