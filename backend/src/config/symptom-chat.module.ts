/**
 * 증상 분석 챗봇 모듈
 * 
 * WebSocket Gateway와 Agentend 서비스를 제공합니다.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SymptomChatGateway } from '../gateways/symptom-chat.gateway';
import { AgentendService } from '../services/agentend.service';

@Module({
  imports: [ConfigModule],
  providers: [SymptomChatGateway, AgentendService],
  exports: [AgentendService],
})
export class SymptomChatModule {}

