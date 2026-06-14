import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService }       from './database/prisma.service';
import { AuthModule }          from './modules/auth/auth.module';
import { UsersModule }         from './modules/users/users.module';
import { FamiliesModule }      from './modules/families/families.module';
import { CalendarModule }      from './modules/calendar/calendar.module';
import { TasksModule }         from './modules/tasks/tasks.module';
import { ChatModule }          from './modules/chat/chat.module';
import { MemoriesModule }      from './modules/memories/memories.module';
import { FinancesModule }      from './modules/finances/finances.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ShoppingModule }      from './modules/shopping/shopping.module';
import { MealsModule }         from './modules/meals/meals.module';
import { HealthModule }        from './modules/health/health.module';
import { GoalsModule }         from './modules/goals/goals.module';
import { TravelModule }        from './modules/travel/travel.module';
import { DocumentsModule }     from './modules/documents/documents.module';
import { AiModule }            from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    UsersModule,
    FamiliesModule,
    CalendarModule,
    TasksModule,
    ChatModule,
    MemoriesModule,
    FinancesModule,
    NotificationsModule,
    ShoppingModule,
    MealsModule,
    HealthModule,
    GoalsModule,
    TravelModule,
    DocumentsModule,
    AiModule,
  ],
  providers: [PrismaService],
  exports:   [PrismaService],
})
export class AppModule {}
