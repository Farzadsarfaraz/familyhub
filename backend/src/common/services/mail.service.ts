import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host:   this.config.get('SMTP_HOST', 'smtp.gmail.com'),
      port:   Number(this.config.get('SMTP_PORT', 587)),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const link   = `${appUrl}/api/auth/verify-email/${token}`;

    await this.transporter.sendMail({
      from:    `"FamilyHub" <${this.config.get('SMTP_USER')}>`,
      to,
      subject: 'Verify your FamilyHub email',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0A0A0F;color:#fff;border-radius:16px">
          <h1 style="color:#3B6EFF;margin-bottom:8px">Welcome to FamilyHub 👨‍👩‍👧‍👦</h1>
          <p style="color:#aaa">Hi ${name}, verify your email to get started.</p>
          <a href="${link}"
             style="display:inline-block;margin:24px 0;padding:14px 32px;background:#3B6EFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">
            Verify Email
          </a>
          <p style="color:#666;font-size:13px">Or copy this link:<br/><span style="color:#aaa">${link}</span></p>
          <p style="color:#444;font-size:12px;margin-top:32px">Link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        </div>
      `,
    });

    this.logger.log(`Verification email sent to ${to}`);
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const appUrl = this.config.get('APP_URL', 'familyhub://reset-password');
    const link   = `${appUrl}?token=${token}`;

    await this.transporter.sendMail({
      from:    `"FamilyHub" <${this.config.get('SMTP_USER')}>`,
      to,
      subject: 'Reset your FamilyHub password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0A0A0F;color:#fff;border-radius:16px">
          <h1 style="color:#3B6EFF;margin-bottom:8px">Reset Password 🔐</h1>
          <p style="color:#aaa">Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
          <a href="${link}"
             style="display:inline-block;margin:24px 0;padding:14px 32px;background:#3B6EFF;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
          <p style="color:#666;font-size:13px">Token: <span style="color:#aaa">${token}</span></p>
          <p style="color:#444;font-size:12px;margin-top:32px">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }
}
