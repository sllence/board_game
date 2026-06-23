import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { UploadModule } from '../upload/upload.module'
import { SessionsController } from './sessions.controller'
import { SessionsService } from './sessions.service'
import { SessionPhotosController } from './session-photos.controller'
import { SessionPhotosService } from './session-photos.service'

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    UploadModule,
  ],
  controllers: [SessionsController, SessionPhotosController],
  providers: [SessionsService, SessionPhotosService],
  exports: [SessionsService, SessionPhotosService],
})
export class SessionsModule {}
