/**
 * 의료 평가 수정 DTO
 */

export interface UpdateAssessmentDto {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  questionnaire?: any;
  responses?: any;
  doctorId?: string;
}
