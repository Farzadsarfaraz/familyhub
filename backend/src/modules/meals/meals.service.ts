import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MealsService {
  constructor(private prisma: PrismaService) {}

  async getRecipes(familyId: string, category?: string) {
    return this.prisma.recipe.findMany({
      where:   { familyId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRecipe(familyId: string, userId: string, data: {
    name: string; description?: string; imageUrl?: string;
    ingredients: string[]; instructions: string[];
    prepTime?: number; cookTime?: number; servings?: number; calories?: number; category?: string;
  }) {
    return this.prisma.recipe.create({
      data: {
        name:         data.name,
        description:  data.description,
        imageUrl:     data.imageUrl,
        ingredients:  data.ingredients,
        instructions: data.instructions,
        prepTime:     data.prepTime  ?? 0,
        cookTime:     data.cookTime  ?? 0,
        servings:     data.servings  ?? 4,
        calories:     data.calories,
        category:     data.category  ?? 'dinner',
        familyId,
        createdBy:    userId,
      },
    });
  }

  async updateRecipe(id: string, data: Partial<{ name: string; description: string; imageUrl: string; ingredients: string[]; instructions: string[]; category: string }>) {
    return this.prisma.recipe.update({ where: { id }, data });
  }

  async deleteRecipe(id: string) {
    await this.prisma.recipe.findUniqueOrThrow({ where: { id } });
    await this.prisma.recipe.delete({ where: { id } });
    return { success: true };
  }

  async getMealPlan(familyId: string, weekOf: string) {
    const plan = await this.prisma.mealPlan.findUnique({
      where:   { familyId_weekOf: { familyId, weekOf } },
      include: { dayMeals: { orderBy: { date: 'asc' } } },
    });
    return plan;
  }

  async upsertMealPlan(familyId: string, weekOf: string, dayMeals: Array<{
    date: string; breakfast?: string; lunch?: string; dinner?: string; snacks?: string[];
  }>) {
    const plan = await this.prisma.mealPlan.upsert({
      where:  { familyId_weekOf: { familyId, weekOf } },
      create: { familyId, weekOf },
      update: {},
    });
    await this.prisma.dayMeal.deleteMany({ where: { mealPlanId: plan.id } });
    await this.prisma.dayMeal.createMany({
      data: dayMeals.map(d => ({
        date:      new Date(d.date),
        breakfast: d.breakfast,
        lunch:     d.lunch,
        dinner:    d.dinner,
        snacks:    d.snacks ?? [],
        mealPlanId: plan.id,
      })),
    });
    return this.prisma.mealPlan.findUnique({
      where:   { id: plan.id },
      include: { dayMeals: { orderBy: { date: 'asc' } } },
    });
  }
}
