/**
 * 의료 평가 생성 DTO
 */

export interface CreateAssessmentDto {
  title: string;
  description?: string;
  type?: string;
  status?: string;
  questionnaire?: any;
  responses?: any;
  patientId: string;
  doctorId?: string;
}
