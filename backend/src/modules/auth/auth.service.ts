import {
  Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RegisterDto }      from './dto/register.dto';
import { LoginDto }         from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService }      from '../../common/services/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma:   PrismaService,
    private jwt:      JwtService,
    private config:   ConfigService,
    private mail:     MailService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash  = await bcrypt.hash(dto.password, 12);
    const verifyToken   = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email:        dto.email.toLowerCase(),
        name:         dto.name,
        passwordHash,
        verifyToken,
      },
      select: this.safeUserSelect(),
    });

    this.mail.sendVerificationEmail(user.email, user.name, verifyToken)
      .catch((err) => this.logger.warn(`Could not send verification email: ${err.message}`));

    return { success: true, data: user, message: 'Verification email sent' };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      success: true,
      data: {
        user:         this.sanitizeUser(user),
        ...tokens,
      },
    };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { userId, token: refreshToken } });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { success: true, message: 'Logged out' };
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  async refreshTokens(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where:   { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(stored.user.id, stored.user.email);
    return { success: true, data: tokens };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { success: true, message: 'If this email exists, a reset link was sent' };

    const resetToken       = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1h

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { resetToken, resetTokenExpiry },
    });

    this.mail.sendPasswordResetEmail(user.email, user.name, resetToken)
      .catch((err) => this.logger.warn(`Could not send reset email: ${err.message}`));

    return { success: true, message: 'Reset link sent' };
  }

  // ─── Change Password (authenticated) ─────────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true, message: 'Password changed successfully' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken:       dto.token,
        resetTokenExpiry: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { success: true, message: 'Password reset successfully' };
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) throw new BadRequestException('Invalid verification token');

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { isVerified: true, verifyToken: null },
    });

    return { success: true, message: 'Email verified' };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwt.sign(payload, {
      secret:    this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRY', '15m'),
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt    = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private safeUserSelect() {
    return {
      id: true, email: true, name: true, avatar: true,
      role: true, isVerified: true, familyId: true,
      createdAt: true, updatedAt: true,
    } as const;
  }

  private sanitizeUser(user: any) {
    const { passwordHash, verifyToken, resetToken, resetTokenExpiry, ...safe } = user;
    return safe;
  }
}
