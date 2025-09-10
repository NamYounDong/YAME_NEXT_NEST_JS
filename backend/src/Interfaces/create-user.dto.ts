/**
 * 사용자 생성 DTO
 * 새 사용자를 생성할 때 필요한 데이터 구조를 정의합니다.
 */

export class CreateUserDto {
  name: string;                                    // 사용자 이름
  email: string;                                   // 사용자 이메일 (고유)
  password: string;                                // 사용자 비밀번호
  role?: 'patient' | 'doctor' | 'admin';          // 사용자 역할 (기본값: patient)
}
