import { Module } from '@nestjs/common'
import { AuthController, UserController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  controllers: [AuthController, UserController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
