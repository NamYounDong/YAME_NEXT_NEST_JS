/**
 * OpenAI 서비스
 * GPT-4를 활용한 LLM 기반 분석 서비스
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY가 설정되지 않았습니다.');
    }
    this.openai = new OpenAI({
      apiKey: apiKey || '',
    });
  }

  /**
   * GPT-4를 사용하여 증상을 의학 용어로 변환하고 질병을 추론
   * @param symptomText 사용자 입력 증상
   * @param subSymptoms 보조 증상 배열
   * @returns LLM 분석 결과
   */
  async analyzeSymptoms(symptomText: string, subSymptoms?: string[]): Promise<{
    medicalTerms: string[];
    suspectedDiseases: Array<{ disease: string; confidence: number }>;
    severityScore: number;
    analysis: string;
    needsHospital: boolean;
  }> {
    try {
      const prompt = this.buildSymptomAnalysisPrompt(symptomText, subSymptoms);
      this.logger.log(`[OpenAI] 증상 분석 프롬프트:\n${prompt}`);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `당신은 의료 전문가입니다. 사용자의 증상을 분석하여 다음을 제공해주세요:
1. 증상을 의학 용어로 변환
2. 의심되는 질병 목록 (신뢰도 포함)
3. 심각도 점수 (1-10, 10이 가장 심각)
4. 병원 방문 필요 여부
5. 전체 분석 내용

반드시 JSON 형식으로 응답해주세요.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const rawResponse = completion.choices[0].message.content || '{}';
      this.logger.log(`[OpenAI] GPT-4o 응답:\n${rawResponse}`);
      
      const result = JSON.parse(rawResponse);
      this.logger.log(`[OpenAI] 파싱된 결과: ${JSON.stringify(result, null, 2)}`);
      
      return {
        medicalTerms: result.medicalTerms || [],
        suspectedDiseases: result.suspectedDiseases || [],
        severityScore: result.severityScore || 5,
        analysis: result.analysis || '',
        needsHospital: result.needsHospital || false,
      };
    } catch (error) {
      this.logger.error(`증상 분석 실패: ${error.message}`, error.stack);
      throw new Error('증상 분석에 실패했습니다.');
    }
  }

  /**
   * DUR 데이터를 기반으로 약품 추천
   * @param medicalTerms 의학 용어 배열
   * @param suspectedDiseases 의심 질병 목록
   * @param durData DUR 데이터
   * @returns 추천 약품 목록
   */
  async recommendDrugs(
    medicalTerms: string[],
    suspectedDiseases: Array<{ disease: string; confidence: number }>,
    durData: any[],
  ): Promise<Array<{ itemSeq: string; itemName: string; reason: string; cautions: string[] }>> {
    try {
      this.logger.log(`[OpenAI] 약품 추천 요청: 의학용어=${medicalTerms.join(', ')}, DUR 데이터 개수=${durData.length}`);
      
      const prompt = `
다음 증상과 질병에 대해 일반의약품(OTC)을 추천해주세요:

의학 용어: ${medicalTerms.join(', ')}
의심 질병: ${suspectedDiseases.map(d => `${d.disease} (${(d.confidence * 100).toFixed(0)}%)`).join(', ')}

사용 가능한 약품 목록 (품목 기준코드, 품목명, 제조사, 성분):
${durData.slice(0, 50).map(d => `- ${d.ITEM_SEQ || d.itemSeq}: ${d.ITEM_NAME || d.itemName} (${d.ENTP_NAME || d.entpName})`).join('\n')}

다음 형식의 JSON으로 응답해주세요:
{
  "recommendations": [
    {
      "itemSeq": "품목기준코드",
      "itemName": "약품명",
      "reason": "추천 이유",
      "cautions": ["주의사항1", "주의사항2"]
    }
  ]
}

주의: 
- 일반의약품(OTC)만 추천하세요
- 최대 3개까지만 추천하세요
- 심각한 증상의 경우 병원 방문을 권장하세요
`;

      this.logger.log(`[OpenAI] 약품 추천 프롬프트 (처음 500자):\n${prompt.substring(0, 500)}...`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '당신은 약사입니다. 일반의약품(OTC)만 추천할 수 있습니다.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const rawResponse = completion.choices[0].message.content || '{}';
      this.logger.log(`[OpenAI] 약품 추천 GPT-4o 응답:\n${rawResponse}`);
      
      const result = JSON.parse(rawResponse);
      this.logger.log(`[OpenAI] 추천 약품 개수: ${result.recommendations?.length || 0}`);
      
      return result.recommendations || [];
    } catch (error) {
      this.logger.error(`약품 추천 실패: ${error.message}`, error.stack);
      throw new Error('약품 추천에 실패했습니다.');
    }
  }

  /**
   * 증상 분석 프롬프트 생성
   */
  private buildSymptomAnalysisPrompt(symptomText: string, subSymptoms?: string[]): string {
    let prompt = `환자의 증상을 분석해주세요:\n\n주 증상: ${symptomText}`;
    
    if (subSymptoms && subSymptoms.length > 0) {
      prompt += `\n부가 증상: ${subSymptoms.join(', ')}`;
    }

    prompt += `

다음 형식의 JSON으로 응답해주세요:
{
  "medicalTerms": ["의학용어1", "의학용어2"],
  "suspectedDiseases": [
    {"disease": "질병명1", "confidence": 0.8},
    {"disease": "질병명2", "confidence": 0.6}
  ],
  "severityScore": 5,
  "needsHospital": false,
  "analysis": "상세 분석 내용"
}

참고:
- medicalTerms: 증상을 의학 용어로 변환
- suspectedDiseases: 의심되는 질병 목록 (신뢰도 0-1)
- severityScore: 심각도 (1-10, 10이 가장 심각)
- needsHospital: true면 병원 방문 권장, false면 약국에서 해결 가능
- analysis: 전문가 관점의 분석`;

    return prompt;
  }
}

