import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { GamesModule } from '@/modules/games/games.module'
import { GuidesModule } from '@/modules/guides/guides.module'
import { SessionsModule } from '@/modules/sessions/sessions.module'
import { AiModule } from '@/modules/ai/ai.module'
import { AuthModule as LegacyAuthModule } from '@/modules/auth/auth.module'
import { WheelModule } from '@/modules/wheel/wheel.module'
import { FeedbackModule } from '@/modules/feedback/feedback.module'
import { UploadModule } from '@/modules/upload/upload.module'
import { GameRulesModule } from '@/modules/game-rules/game-rules.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    AuthModule,
    GamesModule, GuidesModule, SessionsModule, AiModule, LegacyAuthModule, WheelModule, FeedbackModule, UploadModule, GameRulesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
