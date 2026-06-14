import {
  Controller, Get, Patch, Delete, Post, Body, Req, UseGuards,
  HttpCode, HttpStatus, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsOptional, IsString } from 'class-validator';

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
  constructor(
    private users:      UsersService,
    private cloudinary: CloudinaryService,
  ) {}

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

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteMe(@Req() req: any) {
    return this.users.deleteAccount(req.user.id);
  }

  @Patch('me/push-token')
  async updatePushToken(@Req() req: any, @Body() dto: UpdatePushTokenDto) {
    return this.users.updatePushToken(req.user.id, dto.pushToken);
  }

  @Post('upload-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.cloudinary.uploadBuffer(file.buffer, 'familyhub/avatars');
    return { success: true, data: { url: result.secureUrl } };
  }
}
