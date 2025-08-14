import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Process } from './entities/process.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class ProcessService {
  constructor(
    @InjectRepository(Process)
    private readonly processRepository: MongoRepository<Process>,
  ) {}

  async insertDetails(processData) {
    const { mailsSuccess, mailsError, messageId } = processData;

    if (mailsSuccess && Array.isArray(mailsSuccess)) {
      for (const mail of mailsSuccess) {
        const processEntity = this.processRepository.create({
          messageId: messageId,
          email: mail,
          status: 'success',
        });

        await this.processRepository.save(processEntity);
      }
    }

    if (mailsError && Array.isArray(mailsError)) {
      for (const mail of mailsError) {
        const processEntity = this.processRepository.create({
          messageId: messageId,
          email: mail,
          status: 'error',
        });

        await this.processRepository.save(processEntity);
      }
    }
  }

  async findAll(): Promise<Process[]> {
    return await this.processRepository.find();
  }

  async findOne(id: string): Promise<Process> {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException(`Process with ID ${id} not found`);
    }

    const process = await this.processRepository.findOne({
      where: { _id: new ObjectId(id) } as any,
    });

    if (!process) {
      throw new NotFoundException(`Process with ID ${id} not found`);
    }

    return process;
  }

  async findByMessageId(messageId: string): Promise<Process | null> {
    return await this.processRepository.findOne({
      where: { messageId } as any,
    });
  }

  async update(id: string, updateData: Partial<Process>): Promise<Process> {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException(`Process with ID ${id} not found`);
    }

    const objectId = new ObjectId(id);

    const existingProcess = await this.processRepository.findOne({
      where: { _id: objectId } as any,
    });

    if (!existingProcess) {
      throw new NotFoundException(`Process with ID ${id} not found`);
    }
    await this.processRepository.update(objectId, updateData as any);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException(`Process with ID ${id} not found`);
    }

    const result = await this.processRepository.delete(new ObjectId(id));

    if (result.affected === 0) {
      throw new NotFoundException(`Process with ID ${id} not found`);
    }
  }

  async findByStatus(status: string): Promise<Process[]> {
    return await this.processRepository.find({
      where: { status } as any,
    });
  }
}
