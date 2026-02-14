import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { WebinarsModule } from './modules/webinars/webinars.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WebinarsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
