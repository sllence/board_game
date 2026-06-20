import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { StorageModule } from '@/modules/storage/storage.module'
import { GameRulesController } from './game-rules.controller'
import { GameRulesService } from './game-rules.service'

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for PDF
    }),
    StorageModule,
  ],
  controllers: [GameRulesController],
  providers: [GameRulesService],
  exports: [GameRulesService],
})
export class GameRulesModule {}