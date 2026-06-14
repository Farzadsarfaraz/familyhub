import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports:     [ConfigModule],
  controllers: [UsersController],
  providers:   [UsersService, PrismaService, CloudinaryService],
  exports:     [UsersService],
})
export class UsersModule {}
