/**
 * 사용자 수정 DTO
 * 기존 사용자 정보를 수정할 때 필요한 데이터 구조를 정의합니다.
 */

export class UpdateUserDto {
  name?: string;                                   // 사용자 이름
  email?: string;                                  // 사용자 이메일
  password?: string;                               // 사용자 비밀번호
  role?: 'patient' | 'doctor' | 'admin';          // 사용자 역할
}
