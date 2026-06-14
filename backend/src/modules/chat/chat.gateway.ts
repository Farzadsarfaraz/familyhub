import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private userSockets = new Map<string, string[]>();

  constructor(
    private chatService:    ChatService,
    private jwtService:     JwtService,
    private configService:  ConfigService,
  ) {}

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) { socket.disconnect(); return; }

      const payload = this.jwtService.verify(token, { secret: this.configService.get('JWT_SECRET') });
      socket.userId = payload.sub;

      const existing = this.userSockets.get(socket.userId) ?? [];
      this.userSockets.set(socket.userId, [...existing, socket.id]);

      this.logger.log(`User ${socket.userId} connected`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId) {
      const sockets = (this.userSockets.get(socket.userId) ?? []).filter((id) => id !== socket.id);
      if (sockets.length === 0) this.userSockets.delete(socket.userId);
      else this.userSockets.set(socket.userId, sockets);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() data: { roomId: string }) {
    socket.join(data.roomId);
    this.logger.log(`User ${socket.userId} joined room ${data.roomId}`);
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() data: { roomId: string }) {
    socket.leave(data.roomId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; content: string; type?: string; mediaUrl?: string; replyTo?: string },
  ) {
    if (!socket.userId) return;

    const message = await this.chatService.createMessage({
      roomId:   data.roomId,
      senderId: socket.userId,
      content:  data.content,
      type:     (data.type as any) ?? 'TEXT',
      mediaUrl: data.mediaUrl,
      replyTo:  data.replyTo,
    });

    this.server.to(data.roomId).emit('new_message', message);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    socket.to(data.roomId).emit('user_typing', { userId: socket.userId, isTyping: data.isTyping });
  }

  @SubscribeMessage('add_reaction')
  async handleReaction(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string; roomId: string },
  ) {
    if (!socket.userId) return;
    const reaction = await this.chatService.addReaction(data.messageId, socket.userId, data.emoji);
    this.server.to(data.roomId).emit('reaction_updated', { messageId: data.messageId, reaction });
  }

  // Emit to a specific user
  emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId) ?? [];
    socketIds.forEach((id) => this.server.to(id).emit(event, data));
  }
}
