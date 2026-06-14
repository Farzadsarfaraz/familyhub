import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('memories')
export class MemoriesController {
  constructor(private memories: MemoriesService) {}

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
