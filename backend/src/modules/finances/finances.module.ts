import { Module } from '@nestjs/common';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [FinancesController],
  providers:   [FinancesService, PrismaService],
})
export class FinancesModule {}
