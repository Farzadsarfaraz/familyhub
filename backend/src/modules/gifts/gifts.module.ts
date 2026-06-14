import { Module } from '@nestjs/common';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [GiftsController],
  providers:   [GiftsService, PrismaService],
})
export class GiftsModule {}
