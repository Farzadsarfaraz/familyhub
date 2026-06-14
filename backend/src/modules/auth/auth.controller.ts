import {
  Controller, Post, Body, UseGuards, Get, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto }       from './dto/register.dto';
import { LoginDto }          from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto }  from './dto/reset-password.dto';
import { RefreshTokenDto }   from './dto/refresh-token.dto';
import { JwtAuthGuard }      from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: any, @Body() body: { refreshToken?: string }) {
    return this.authService.logout(req.user.id, body.refreshToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('verify-email/:token')
  verifyEmail(@Req() req: any) {
    return this.authService.verifyEmail(req.params.token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return { success: true, data: req.user };
  }
}
