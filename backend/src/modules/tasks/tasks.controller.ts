import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get()
  async list(@Req() req: any, @Query('status') status?: any, @Query('assignedTo') assignedTo?: string) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.tasks.list(req.user.familyId, status, assignedTo);
    return { success: true, data };
  }

  @Get('leaderboard')
  async leaderboard(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.tasks.leaderboard(req.user.familyId);
    return { success: true, data };
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const data = await this.tasks.create(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.tasks.update(id, body);
    return { success: true, data };
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string) {
    const data = await this.tasks.toggleComplete(id);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.tasks.delete(id);
  }
}
