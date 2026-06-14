import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports:     [ConfigModule],
  controllers: [AiController],
  providers:   [AiService, PrismaService],
  exports:     [AiService],
})
export class AiModule {}
