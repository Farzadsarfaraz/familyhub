import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports:     [ConfigModule],
  controllers: [MemoriesController],
  providers:   [MemoriesService, CloudinaryService, PrismaService],
})
export class MemoriesModule {}
