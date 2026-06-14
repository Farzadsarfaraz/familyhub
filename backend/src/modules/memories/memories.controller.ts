import {
  Controller, Get, Post, Delete, Body, Param, Query, Req, Res,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MemoriesService } from './memories.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('memories')
export class MemoriesController {
  constructor(
    private memories:   MemoriesService,
    private cloudinary: CloudinaryService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No file provided');
    const mimeType     = file.mimetype;
    const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';
    const result       = await this.cloudinary.uploadBuffer(file.buffer, 'familyhub/memories', resourceType);
    const memory       = await this.memories.createMemory(req.user.familyId, req.user.id, {
      mediaUrl:     result.secureUrl,
      thumbnailUrl: result.thumbnailUrl,
      mediaType:    resourceType === 'video' ? 'VIDEO' : 'PHOTO',
    });
    return { success: true, data: memory };
  }

  @Get()
  async getMemories(@Req() req: any, @Query('albumId') albumId?: string) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.memories.getMemories(req.user.familyId, albumId);
    return { success: true, data };
  }

  @Post()
  async createMemory(@Req() req: any, @Body() body: any) {
    const data = await this.memories.createMemory(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async deleteMemory(@Param('id') id: string) {
    return this.memories.deleteMemory(id);
  }

  @Post(':id/like')
  async toggleLike(@Req() req: any, @Param('id') id: string) {
    const data = await this.memories.toggleLike(id, req.user.id);
    return { success: true, data };
  }

  @Post(':id/comments')
  async addComment(@Req() req: any, @Param('id') id: string, @Body('content') content: string) {
    const data = await this.memories.addComment(id, req.user.id, content);
    return { success: true, data };
  }

  @Get('albums')
  async getAlbums(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.memories.getAlbums(req.user.familyId);
    return { success: true, data };
  }

  @Post('albums')
  async createAlbum(@Req() req: any, @Body() body: any) {
    const data = await this.memories.createAlbum(req.user.familyId, body);
    return { success: true, data };
  }
}
