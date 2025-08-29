import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Process } from './entities/process.entity';
import { ProcessController } from './process.controller';
import { ProcessService } from './process.service';

@Module({
  controllers: [ProcessController],
  imports: [TypeOrmModule.forFeature([Process])],
  providers: [ProcessService],
  exports: [ProcessService],
})
export class ProcessModule {}
