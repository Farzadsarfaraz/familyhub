import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MealsService } from './meals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private meals: MealsService) {}

  @Get('recipes')
  async getRecipes(@Req() req: any, @Query('category') category?: string) {
    if (!req.user.familyId) return { success: true, data: [] };
    const data = await this.meals.getRecipes(req.user.familyId, category);
    return { success: true, data };
  }

  @Post('recipes')
  async createRecipe(@Req() req: any, @Body() body: any) {
    const data = await this.meals.createRecipe(req.user.familyId, req.user.id, body);
    return { success: true, data };
  }

  @Patch('recipes/:id')
  async updateRecipe(@Param('id') id: string, @Body() body: any) {
    const data = await this.meals.updateRecipe(id, body);
    return { success: true, data };
  }

  @Delete('recipes/:id')
  async deleteRecipe(@Param('id') id: string) {
    return this.meals.deleteRecipe(id);
  }

  @Get('plan')
  async getMealPlan(@Req() req: any, @Query('weekOf') weekOf: string) {
    if (!req.user.familyId) return { success: true, data: null };
    const week = weekOf ?? new Date().toISOString().slice(0, 10);
    const data = await this.meals.getMealPlan(req.user.familyId, week);
    return { success: true, data };
  }

  @Post('plan')
  async upsertMealPlan(@Req() req: any, @Body() body: { weekOf: string; dayMeals: any[] }) {
    const data = await this.meals.upsertMealPlan(req.user.familyId, body.weekOf, body.dayMeals);
    return { success: true, data };
  }
}
