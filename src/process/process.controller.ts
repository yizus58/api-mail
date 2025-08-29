import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProcessService } from './process.service';

@ApiTags('Process')
@Controller('process')
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  @Post()
  insertDetails(@Body() createProcessDto: any) {
    return this.processService.insertDetails(createProcessDto);
  }
}
