import { Module } from '@nestjs/common'
import { SessionsController } from './sessions.controller'
import { SessionsService } from './sessions.service'
import { SessionPhotosController } from './session-photos.controller'
import { SessionPhotosService } from './session-photos.service'

@Module({
  controllers: [SessionsController, SessionPhotosController],
  providers: [SessionsService, SessionPhotosService],
  exports: [SessionsService],
})
export class SessionsModule {}
