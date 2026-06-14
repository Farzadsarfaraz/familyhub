import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatGateway, ChatService, PrismaService],
  exports:   [ChatService],
})
export class ChatModule {}
