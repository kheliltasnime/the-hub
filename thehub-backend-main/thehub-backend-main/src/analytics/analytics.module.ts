import { Module } from '@nestjs/common';
import { AnalyticsListener } from './analytics.listener';
import { NotificationListener } from './notification.listener';

@Module({
  providers: [AnalyticsListener,NotificationListener],
})
export class AnalyticsModule {}