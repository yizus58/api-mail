import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProcessService } from './process.service';

@Controller('process')
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  @Post()
  insertDetails(@Body() createProcessDto: any) {
    return this.processService.insertDetails(createProcessDto);
  }

  @Get()
  findAll() {
    return this.processService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.processService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProcessDto: any) {
    return this.processService.update(id, updateProcessDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.processService.remove(id);
  }
}
