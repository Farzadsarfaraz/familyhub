import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private docs: DocumentsService) {}

  @Get()
  async list(@Req() req: any, @Query('category') category?: string) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.docs.list(req.user.familyId, category);
    return { success: true, data };
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const data = await this.docs.create(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.docs.delete(id);
  }
}
