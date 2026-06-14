import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';

@Module({
  controllers: [FamiliesController],
  providers:   [FamiliesService, PrismaService],
  exports:     [FamiliesService],
})
export class FamiliesModule {}
