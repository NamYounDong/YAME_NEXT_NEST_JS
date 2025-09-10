/**
 * 의료 평가 서비스
 * 
 * 이 서비스는 YAME 시스템의 핵심 기능인 의료 평가 및 진단을 관리하는 
 * 핵심 서비스입니다.
 * 
 * 주요 역할:
 * 1. 의료 평가 관리: 환자의 증상, 병력, 검사 결과를 종합하여 의료 평가 생성
 * 2. 진단 지원: 증상 기반의 예상 진단 및 차별 진단 정보 제공
 * 3. 치료 계획 수립: 진단 결과를 바탕으로 한 개인화된 치료 계획 제안
 * 4. 의료진 협업: 다학제 의료진 간의 협업을 위한 평가 정보 공유
 * 5. API 제공: 프론트엔드에서 의료 평가 기능을 사용할 수 있는 인터페이스
 * 
 * 의료 평가 프로세스:
 * - 증상 수집: 환자의 주관적 증상 및 객관적 징후 수집
 * - 병력 조사: 과거 병력, 가족력, 복용 약물 등 상세 병력 조사
 * - 검사 결과 분석: 혈액검사, 영상검사, 생리학적 검사 결과 종합 분석
 * - 진단 추론: 증상과 검사 결과를 바탕으로 한 의학적 추론
 * - 치료 계획: 진단 결과에 따른 개인화된 치료 방안 제시
 * 
 * 기술적 특징:
 * - 의학 지식베이스: 의료 전문가들이 구축한 체계적인 의학 지식 시스템
 * - 머신러닝 지원: 증상-진단 간의 패턴을 학습하여 진단 정확도 향상
 * - 개인화 알고리즘: 환자 개별 특성을 고려한 맞춤형 평가 제공
 * - 실시간 업데이트: 최신 의학 연구 결과를 반영한 동적 지식베이스
 * - 감사 추적: 모든 평가 과정에 대한 상세한 로그 및 추적성 확보
 * 
 * 사용 사례:
 * - 의사가 환자 진단을 내릴 때
 * - 간호사가 환자 상태를 평가할 때
 * - 약사가 약물 상호작용을 확인할 때
 * - 환자가 자신의 증상을 이해할 때
 * - 의료진 간의 협업 및 정보 공유 시
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CreateAssessmentDto } from '../interfaces/create-assessment.dto';
import { UpdateAssessmentDto } from '../interfaces/update-assessment.dto';

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  type: 'general' | 'cardiac' | 'neurological' | 'respiratory' | 'psychological';
  status: 'pending' | 'in_progress' | 'completed' | 'reviewed';
  questionnaire?: any;
  responses?: any;
  results?: string;
  doctorNotes?: string;
  patientId: number;
  doctorId?: number;
  createdAt: Date;
  updatedAt: Date;
  patient?: {
    id: number;
    name: string;
    email: string;
  };
  doctor?: {
    id: number;
    name: string;
    email: string;
  };
}

@Injectable()
export class AssessmentsService {
  constructor(
    private databaseService: DatabaseService,
  ) {}

  async create(createAssessmentDto: CreateAssessmentDto): Promise<Assessment> {
    const sql = `
      INSERT INTO assessments (title, description, type, status, questionnaire, responses, patientId, doctorId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const result = await this.databaseService.execute(sql, [
      createAssessmentDto.title,
      createAssessmentDto.description || null,
      createAssessmentDto.type || 'general',
      createAssessmentDto.status || 'pending',
      createAssessmentDto.questionnaire ? JSON.stringify(createAssessmentDto.questionnaire) : null,
      createAssessmentDto.responses ? JSON.stringify(createAssessmentDto.responses) : null,
      createAssessmentDto.patientId,
      createAssessmentDto.doctorId || null,
    ]);

    return this.findOne(result.insertId);
  }

  async findAll(): Promise<Assessment[]> {
    const sql = `
      SELECT 
        a.*,
        p.name as patient_name, p.email as patient_email,
        d.name as doctor_name, d.email as doctor_email
      FROM assessments a
      LEFT JOIN users p ON a.patientId = p.id
      LEFT JOIN users d ON a.doctorId = d.id
      ORDER BY a.createdAt DESC
    `;
    
    const rows = await this.databaseService.query(sql);
    return this.mapAssessmentsWithRelations(rows);
  }

  async findByPatient(patientId: number): Promise<Assessment[]> {
    const sql = `
      SELECT 
        a.*,
        p.name as patient_name, p.email as patient_email,
        d.name as doctor_name, d.email as doctor_email
      FROM assessments a
      LEFT JOIN users p ON a.patientId = p.id
      LEFT JOIN users d ON a.doctorId = d.id
      WHERE a.patientId = ?
      ORDER BY a.createdAt DESC
    `;
    
    const rows = await this.databaseService.query(sql, [patientId]);
    return this.mapAssessmentsWithRelations(rows);
  }

  async findByDoctor(doctorId: number): Promise<Assessment[]> {
    const sql = `
      SELECT 
        a.*,
        p.name as patient_name, p.email as patient_email,
        d.name as doctor_name, d.email as doctor_email
      FROM assessments a
      LEFT JOIN users p ON a.patientId = p.id
      LEFT JOIN users d ON a.doctorId = d.id
      WHERE a.doctorId = ?
      ORDER BY a.createdAt DESC
    `;
    
    const rows = await this.databaseService.query(sql, [doctorId]);
    return this.mapAssessmentsWithRelations(rows);
  }

  async findOne(id: number): Promise<Assessment> {
    const sql = `
      SELECT 
        a.*,
        p.name as patient_name, p.email as patient_email,
        d.name as doctor_name, d.email as doctor_email
      FROM assessments a
      LEFT JOIN users p ON a.patientId = p.id
      LEFT JOIN users d ON a.doctorId = d.id
      WHERE a.id = ?
    `;
    
    const rows = await this.databaseService.query(sql, [id]);
    
    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }
    
    return this.mapAssessmentsWithRelations(rows)[0];
  }

  async update(id: number, updateAssessmentDto: UpdateAssessmentDto): Promise<Assessment> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updateAssessmentDto.title) {
      updateFields.push('title = ?');
      updateValues.push(updateAssessmentDto.title);
    }
    if (updateAssessmentDto.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(updateAssessmentDto.description);
    }
    if (updateAssessmentDto.type) {
      updateFields.push('type = ?');
      updateValues.push(updateAssessmentDto.type);
    }
    if (updateAssessmentDto.status) {
      updateFields.push('status = ?');
      updateValues.push(updateAssessmentDto.status);
    }
    if (updateAssessmentDto.questionnaire !== undefined) {
      updateFields.push('questionnaire = ?');
      updateValues.push(updateAssessmentDto.questionnaire ? JSON.stringify(updateAssessmentDto.questionnaire) : null);
    }
    if (updateAssessmentDto.responses !== undefined) {
      updateFields.push('responses = ?');
      updateValues.push(updateAssessmentDto.responses ? JSON.stringify(updateAssessmentDto.responses) : null);
    }
    if (updateAssessmentDto.doctorId !== undefined) {
      updateFields.push('doctorId = ?');
      updateValues.push(updateAssessmentDto.doctorId);
    }

    if (updateFields.length === 0) {
      return this.findOne(id);
    }

    updateFields.push('updatedAt = NOW()');
    updateValues.push(id);

    const sql = `
      UPDATE assessments
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const result = await this.databaseService.execute(sql, updateValues);
    
    if (result.affectedRows === 0) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const sql = 'DELETE FROM assessments WHERE id = ?';
    const result = await this.databaseService.execute(sql, [id]);
    
    if (result.affectedRows === 0) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }
  }

  private mapAssessmentsWithRelations(rows: any[]): Assessment[] {
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      questionnaire: row.questionnaire ? JSON.parse(row.questionnaire) : null,
      responses: row.responses ? JSON.parse(row.responses) : null,
      results: row.results,
      doctorNotes: row.doctorNotes,
      patientId: row.patientId,
      doctorId: row.doctorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient_name ? {
        id: row.patientId,
        name: row.patient_name,
        email: row.patient_email,
      } : undefined,
      doctor: row.doctor_name ? {
        id: row.doctorId,
        name: row.doctor_name,
        email: row.doctor_email,
      } : undefined,
    }));
  }
}
