import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { GiftsService } from './gifts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('gifts')
export class GiftsController {
  constructor(private gifts: GiftsService) {}

  @Get('occasions')
  async getOccasions(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.gifts.getOccasions(req.user.familyId);
    return { success: true, data };
  }

  @Post('occasions')
  async createOccasion(@Req() req: any, @Body() body: any) {
    const data = await this.gifts.createOccasion(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Patch('occasions/:id')
  async updateOccasion(@Param('id') id: string, @Body() body: any) {
    const data = await this.gifts.updateOccasion(id, body);
    return { success: true, data };
  }

  @Delete('occasions/:id')
  async deleteOccasion(@Param('id') id: string) {
    return this.gifts.deleteOccasion(id);
  }

  @Post('occasions/:id/gifts')
  async addGift(@Req() req: any, @Param('id') occasionId: string, @Body() body: any) {
    const data = await this.gifts.addGift(occasionId, req.user.id, body);
    return { success: true, data };
  }

  @Patch('items/:id')
  async updateGift(@Param('id') id: string, @Body() body: any) {
    const data = await this.gifts.updateGift(id, body);
    return { success: true, data };
  }

  @Patch('items/:id/cycle')
  async cycleGiftStatus(@Param('id') id: string) {
    const data = await this.gifts.cycleGiftStatus(id);
    return { success: true, data };
  }

  @Delete('items/:id')
  async deleteGift(@Param('id') id: string) {
    return this.gifts.deleteGift(id);
  }
}
