import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController, UserController } from './auth.controller'
import { AuthService } from './auth.service'
import { StorageModule } from '../storage/storage.module'
import { MulterModule } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'

@Module({
  imports: [
    StorageModule,
    MulterModule.register({ storage: memoryStorage() }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'board-game-secret-key-change-in-production',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
