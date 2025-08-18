import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { Process } from './entities/process.entity';

@Injectable()
export class ProcessService {
  constructor(
    @InjectRepository(Process)
    private readonly processRepository: MongoRepository<Process>,
  ) {}

  async insertDetails(processData: any) {
    const { mailsSuccess, mailsError, messageId } = processData;
    const savedItems: Process[] = [];

    if (mailsSuccess && Array.isArray(mailsSuccess)) {
      for (const mail of mailsSuccess) {
        const processEntity = this.processRepository.create({
          messageId: messageId,
          email: mail,
          status: 'success',
        });
        const saved = await this.processRepository.save(processEntity);
        if (saved) {
          savedItems.push({
            id: saved._id,
            email: saved.email,
            status: saved.status
          });
        }
      }
    }

    if (mailsError && Array.isArray(mailsError)) {
      for (const mail of mailsError) {
        const processEntity = this.processRepository.create({
          messageId: messageId,
          email: mail,
          status: 'error',
        });
        const saved = await this.processRepository.save(processEntity);
        if (saved) {
          savedItems.push({
            id: saved._id,
            email: saved.email,
            status: saved.status
          });
        }
      }
    }

    return {
      status: true,
      data: {
        items: savedItems,
        message: 'Process details saved successfully',
      },
    };
  }
}
