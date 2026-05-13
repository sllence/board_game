import { Module } from '@nestjs/common'
import { AuthController, UserController } from './auth.controller'
import { AuthService } from './auth.service'
import { StorageModule } from '../storage/storage.module'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'

@Module({
  imports: [
    StorageModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [AuthController, UserController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
