import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
// ... other imports ...
import { NotificationModule } from '../notifications/notification.module'; // ✅ Import this
@Global() // Makes JwtService available everywhere without re-importing
@Module({
  imports: [
    NotificationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule,],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'rose-petal-secret',
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService,JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}