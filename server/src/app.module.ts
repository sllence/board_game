import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { GamesModule } from '@/modules/games/games.module'
import { GuidesModule } from '@/modules/guides/guides.module'
import { SessionsModule } from '@/modules/sessions/sessions.module'
import { AiModule } from '@/modules/ai/ai.module'
import { AuthModule } from '@/modules/auth/auth.module'
import { WheelModule } from '@/modules/wheel/wheel.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    GamesModule, GuidesModule, SessionsModule, AiModule, AuthModule, WheelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
