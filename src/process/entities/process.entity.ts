import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('processes')
export class Process {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  messageId: string;

  @Column()
  status: string;

  @Column()
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get id(): string {
    return this._id ? this._id.toString() : '';
  }
}
