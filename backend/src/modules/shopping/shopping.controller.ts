import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ShoppingService } from './shopping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('shopping')
export class ShoppingController {
  constructor(private shopping: ShoppingService) {}

  @Get('list')
  async getList(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: null };
    const data = await this.shopping.getOrCreateList(req.user.familyId, req.user.id);
    return { success: true, data };
  }

  @Post('items')
  async addItem(@Req() req: any, @Body() body: any) {
    const list = await this.shopping.getOrCreateList(req.user.familyId, req.user.id);
    const data = await this.shopping.addItem(list.id, req.user.id, body);
    return { success: true, data };
  }

  @Patch('items/:id')
  async updateItem(@Param('id') id: string, @Body() body: any) {
    const data = await this.shopping.updateItem(id, body);
    return { success: true, data };
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    return this.shopping.deleteItem(id);
  }

  @Delete('list/checked')
  async clearChecked(@Req() req: any) {
    const list = await this.shopping.getOrCreateList(req.user.familyId, req.user.id);
    return this.shopping.clearChecked(list.id);
  }
}
