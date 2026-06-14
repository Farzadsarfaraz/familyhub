import { Module } from '@nestjs/common';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [ShoppingController],
  providers:   [ShoppingService, PrismaService],
})
export class ShoppingModule {}
