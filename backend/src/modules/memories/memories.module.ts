import { Module } from '@nestjs/common';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [MemoriesController],
  providers:   [MemoriesService, PrismaService],
})
export class MemoriesModule {}
