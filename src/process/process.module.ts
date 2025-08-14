import { Process } from './entities/process.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ProcessService } from './process.service';
import { ProcessController } from './process.controller';

@Module({
  controllers: [ProcessController],
  imports: [TypeOrmModule.forFeature([Process])],
  providers: [ProcessService],
  exports: [ProcessService],
})
export class ProcessModule {}
