/**
 * 사용자 엔티티
 * 데이터베이스의 users 테이블과 매핑되는 엔티티 클래스입니다.
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Assessment } from './assessment.entity';

/**
 * 사용자 역할 열거형
 * 시스템에서 사용할 수 있는 사용자 역할들을 정의합니다.
 */
export enum UserRole {
  PATIENT = 'patient', // 환자 - 의료 평가를 받는 사용자
  DOCTOR = 'doctor',   // 의사 - 의료 평가를 수행하는 사용자
  ADMIN = 'admin',     // 관리자 - 시스템 관리 권한을 가진 사용자
}

/**
 * 사용자 엔티티 클래스
 * 시스템 사용자의 정보를 저장하는 데이터베이스 테이블과 매핑됩니다.
 */
@Entity('users')
export class User {
  /** 사용자 고유 ID (자동 증가) */
  @ApiProperty({ description: '사용자 고유 ID' })
  @PrimaryGeneratedColumn()
  id: number;

  /** 사용자 이름 */
  @ApiProperty({ description: '사용자 이름' })
  @Column()
  name: string;

  /** 사용자 이메일 (고유값) */
  @ApiProperty({ description: '사용자 이메일 주소' })
  @Column({ unique: true })
  email: string;

  /** 사용자 비밀번호 (해싱된 상태로 저장) */
  @Column()
  password: string;

  /** 사용자 역할 */
  @ApiProperty({ enum: UserRole, description: '사용자 역할 (patient, doctor, admin)' })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role: UserRole;

  /** 계정 생성 일시 */
  @ApiProperty({ description: '계정 생성 일시' })
  @CreateDateColumn()
  createdAt: Date;

  /** 마지막 수정 일시 */
  @ApiProperty({ description: '마지막 수정 일시' })
  @UpdateDateColumn()
  updatedAt: Date;

  /** 사용자가 받은 평가들 (환자인 경우) */
  @OneToMany(() => Assessment, assessment => assessment.patient)
  assessments: Assessment[];
}




