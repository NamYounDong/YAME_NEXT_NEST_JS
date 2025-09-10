/**
 * 데이터 모델 컨트롤러
 * 
 * 이 컨트롤러는 YAME 시스템의 인공지능 관련 API를 제공합니다.
 * 
 * 주요 역할:
 * 
 * 제공하는 엔드포인트:
 */

// NestJS 핵심 모듈 및 데코레이터 임포트
import { Controller, Get, Post, Query, Logger, Req } from '@nestjs/common';
// Express HTTP 요청 객체 및 질병 크롤러 서비스 임포트
import { Request } from 'express';
import { DataMLService } from 'src/services/data-ml.service';
import { ResponseBaseDto } from 'src/Interfaces/response-base.dto';

@Controller('api/data-ml') // '/api/data-ml' 경로로 매핑 (NestJS 라우팅 시스템)
export class DataMLController {
    /**
     * 로거 인스턴스 생성
     * NestJS Logger를 사용하여 컨트롤러의 모든 활동을 기록
     */
    private readonly logger = new Logger(DataMLController.name);


    /**
     * DataMLController 생성자
     * NestJS 의존성 주입(DI) 시스템을 통해 필요한 서비스 인스턴스들을 자동으로 주입받음
     * @param dataMLService - 인공지능 관리 서비스 (의존성 주입으로 자동 생성)
    */
   constructor(
       private dataMLService: DataMLService,
    ) {}
    














    // * 파기 예정 소스
    // - 학습으로서 의미 없는 소스(데이터 이슈)
    // - 설계 및 판단 미스 : 증상 및 질병 데이터의 집합이 아닌, 질병의 마스터 데이터로 학습하려고 함. 이는 러닝의 이해가 부족하여 잘못된 판단을 함.
    // - 일단, 예제로서 남겨둘 예정.
    @Get('disease-train')
    async diseaseTrain(
        @Query('epochs') epochs?: string,
        @Query('batchSize') batchSize?: string,
        @Query('learningRate') learningRate?: string,
        @Req() req?: Request
    ): Promise<ResponseBaseDto> {
        try {
            this.logger.log('Request Train Disease Started ...');
             
            // 쿼리 파라미터 파싱 (기본값 설정)
            const epochsNum = epochs ? parseInt(epochs, 10) : 10;
            const batchSizeNum = batchSize ? parseInt(batchSize, 10) : 64;
            const learningRateNum = learningRate ? parseFloat(learningRate) : 2e-4;
            
            this.logger.log(`Training parameters: epochs=${epochsNum}, batchSize=${batchSizeNum}, learningRate=${learningRateNum}`);
            
            return await this.dataMLService.diseaseTrain(epochsNum, batchSizeNum, learningRateNum);
        } catch (error) {
            this.logger.error(`질병 훈련 실패: ${error}`);
            return {
                success: false,
                message: '질병 훈련 실패',
                data: null,
            }
        }
    }
}