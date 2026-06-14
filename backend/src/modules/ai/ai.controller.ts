import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Get('summary')
  async getDailySummary(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: 'No family connected yet.' };
    const data = await this.ai.getDailySummary(req.user.familyId);
    return { success: true, data };
  }

  @Post('chat')
  async chat(@Req() req: any, @Body('message') message: string) {
    const data = await this.ai.chat(req.user.familyId, req.user.id, message);
    return { success: true, data };
  }

  @Get('story')
  async generateFamilyStory(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: '' };
    const data = await this.ai.generateFamilyStory(req.user.familyId);
    return { success: true, data };
  }

  @Get('meal-suggestions')
  async suggestMeals(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.ai.suggestMeals(req.user.familyId);
    return { success: true, data };
  }
}
