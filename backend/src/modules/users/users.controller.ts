import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsOptional, IsString, IsUrl } from 'class-validator';

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() avatar?: string;
}

class UpdatePushTokenDto {
  @IsString() pushToken: string;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const user = await this.users.findById(req.user.id);
    return { success: true, data: user };
  }

  @Patch('me')
  async updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const user = await this.users.updateProfile(req.user.id, dto);
    return { success: true, data: user };
  }

  @Patch('me/push-token')
  async updatePushToken(@Req() req: any, @Body() dto: UpdatePushTokenDto) {
    return this.users.updatePushToken(req.user.id, dto.pushToken);
  }
}
