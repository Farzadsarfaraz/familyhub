import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private calendar: CalendarService) {}

  @Get('events')
  async list(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.calendar.getEvents(req.user.familyId, from, to);
    return { success: true, data };
  }

  @Post('events')
  async create(@Req() req: any, @Body() body: any) {
    const data = await this.calendar.create(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Patch('events/:id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const data = await this.calendar.update(id, req.user.id, body);
    return { success: true, data };
  }

  @Delete('events/:id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.calendar.delete(id, req.user.id);
  }
}
