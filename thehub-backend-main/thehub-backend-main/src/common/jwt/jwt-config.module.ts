import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-a-remplacer',
    }),
  ],
  exports: [JwtModule],
})
export class JwtConfigModule {}