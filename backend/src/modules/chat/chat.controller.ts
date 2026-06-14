import { Controller, Get, Param, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('room')
  async getRoom(@Req() req: any) {
    if (!req.user.familyId) throw new BadRequestException('Join a family first');
    const room = await this.chatService.getOrCreateRoom(req.user.familyId);
    return { success: true, data: room };
  }

  @Get('room/:roomId/messages')
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const messages = await this.chatService.getRoomMessages(roomId, cursor, take ? parseInt(take, 10) : 50);
    return { success: true, data: messages.reverse() }; // chronological order
  }
}
