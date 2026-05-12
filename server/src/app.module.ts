import { Module } from '@nestjs/common'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { GamesModule } from '@/modules/games/games.module'
import { GuidesModule } from '@/modules/guides/guides.module'
import { SessionsModule } from '@/modules/sessions/sessions.module'
import { AiModule } from '@/modules/ai/ai.module'
import { AuthModule } from '@/modules/auth/auth.module'

@Module({
  imports: [GamesModule, GuidesModule, SessionsModule, AiModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
