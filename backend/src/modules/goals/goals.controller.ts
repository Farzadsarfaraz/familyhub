import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private goals: GoalsService) {}

  @Get()
  async list(@Req() req: any, @Query('status') status?: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.goals.list(req.user.familyId, status);
    return { success: true, data };
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const data = await this.goals.create(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.goals.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.goals.delete(id);
  }

  @Post(':id/milestones')
  async addMilestone(@Param('id') goalId: string, @Body('title') title: string) {
    const data = await this.goals.addMilestone(goalId, title);
    return { success: true, data };
  }

  @Patch('milestones/:id/toggle')
  async toggleMilestone(@Param('id') id: string) {
    const data = await this.goals.toggleMilestone(id);
    return { success: true, data };
  }
}
