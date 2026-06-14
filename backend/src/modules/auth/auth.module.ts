import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService }    from './auth.service';
import { PrismaService }  from '../../database/prisma.service';
import { JwtStrategy }    from '../../common/strategies/jwt.strategy';
import { MailService }    from '../../common/services/mail.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret:      config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRY', '15m') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, PrismaService, JwtStrategy, MailService],
  exports:     [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
