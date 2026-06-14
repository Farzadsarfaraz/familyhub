import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('finances')
export class FinancesController {
  constructor(private finances: FinancesService) {}

  @Get('transactions')
  async getTransactions(@Req() req: any, @Query('month') month?: string) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.finances.getTransactions(req.user.familyId, month);
    return { success: true, data };
  }

  @Post('transactions')
  async addTransaction(@Req() req: any, @Body() body: any) {
    const data = await this.finances.addTransaction(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Param('id') id: string) {
    return this.finances.deleteTransaction(id);
  }

  @Get('budgets')
  async getBudgets(@Req() req: any, @Query('month') month: string) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.finances.getBudgets(req.user.familyId, month ?? new Date().toISOString().slice(0, 7));
    return { success: true, data };
  }

  @Post('budgets')
  async upsertBudget(@Req() req: any, @Body() body: any) {
    const data = await this.finances.upsertBudget(req.user.familyId, body);
    return { success: true, data };
  }

  @Get('savings')
  async getSavingsGoals(@Req() req: any) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.finances.getSavingsGoals(req.user.familyId);
    return { success: true, data };
  }

  @Post('savings')
  async createSavingsGoal(@Req() req: any, @Body() body: any) {
    const data = await this.finances.createSavingsGoal(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Patch('savings/:id')
  async updateSavingsGoal(@Param('id') id: string, @Body() body: any) {
    const data = await this.finances.updateSavingsGoal(id, body);
    return { success: true, data };
  }

  @Delete('savings/:id')
  async deleteSavingsGoal(@Param('id') id: string) {
    return this.finances.deleteSavingsGoal(id);
  }

  @Get('summary')
  async getSummary(@Req() req: any, @Query('month') month?: string) {
    if (!req.user.familyId) return { success: true, data: { income: 0, expense: 0, balance: 0, transactionCount: 0 } };
    const data = await this.finances.getSummary(req.user.familyId, month ?? new Date().toISOString().slice(0, 7));
    return { success: true, data };
  }
}
