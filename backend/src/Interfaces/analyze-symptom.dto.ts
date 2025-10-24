/**
 * 증상 분석 요청 DTO
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class AnalyzeSymptomDto {
  @ApiProperty({
    description: '사용자가 입력한 증상 (자유 텍스트)',
    example: '머리가 아프고 열이 나요',
  })
  @IsString()
  @IsNotEmpty()
  symptomText: string;

  @ApiProperty({
    description: '보조 증상 배열',
    example: ['기침', '콧물', '목 통증'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subSymptoms?: string[];

  @ApiProperty({
    description: '위도',
    example: 37.5665,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: '경도',
    example: 126.9780,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'GPS 정확도 (미터)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  gpsAccuracy?: number;

  @ApiProperty({
    description: '사용자 나이 (DUR 체크용)',
    example: 35,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  userAge?: number;

  @ApiProperty({
    description: '임신 여부 (DUR 체크용)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPregnant?: boolean;
}

