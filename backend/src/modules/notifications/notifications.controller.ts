import { Controller, Get, Post, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  async getAll(@Req() req: any) {
    const data = await this.notifications.getForUser(req.user.id);
    return { success: true, data };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const data = await this.notifications.getUnreadCount(req.user.id);
    return { success: true, data };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string) {
    const data = await this.notifications.markRead(id);
    return { success: true, data };
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.notifications.delete(id);
  }
}
