import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

export enum AssessmentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
}

export enum AssessmentType {
  GENERAL = 'general',
  CARDIAC = 'cardiac',
  NEUROLOGICAL = 'neurological',
  RESPIRATORY = 'respiratory',
  PSYCHOLOGICAL = 'psychological',
}

@Entity('assessments')
export class Assessment {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  description: string;

  @ApiProperty({ enum: AssessmentType })
  @Column({
    type: 'enum',
    enum: AssessmentType,
    default: AssessmentType.GENERAL,
  })
  type: AssessmentType;

  @ApiProperty({ enum: AssessmentStatus })
  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.PENDING,
  })
  status: AssessmentStatus;

  @ApiProperty()
  @Column('json', { nullable: true })
  questionnaire: any;

  @ApiProperty()
  @Column('json', { nullable: true })
  responses: any;

  @ApiProperty()
  @Column('text', { nullable: true })
  results: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  doctorNotes: string;

  @ApiProperty()
  @Column()
  patientId: number;

  @ApiProperty()
  @Column({ nullable: true })
  doctorId: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.assessments)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;
}




