import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, BeforeInsert, getRepository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Ticket, ticket => ticket.department)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async generateCode() {
    const code = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
    this.code = code;
  }
} 