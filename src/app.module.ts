import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './core/interceptors/metrics.interceptor';
import { ClsModule } from 'nestjs-cls';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnvironmentSchema } from './config/env.schema';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './config/typeorm.config';
import { AuditSubscriber } from './core/subscribers/audit.subscriber';
import { AuthModule } from './modules/auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { HealthModule } from './modules/health/health.module';
import { PrometheusModule } from './modules/prometheus/prometheus.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CircuitBreakerModule } from 'nest-circuit-break';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import * as path from 'path';
import { I18nModule, AcceptLanguageResolver } from 'nestjs-i18n';
import { UsersModule } from './modules/users/users.module';
import { SeedingModule } from './modules/seeding/seeding.module';
import Redis from 'ioredis';
import { CacheModule } from './modules/cache/cache.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule,
    CacheModule,
    SeedingModule,
    UsersModule,
    FileUploadModule,
    CircuitBreakerModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    HealthModule,
    PrometheusModule,
    AuthModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const result = EnvironmentSchema.safeParse(config);
        if (!result.success) {
          throw new Error(`Invalid environment variables: ${result.error.message}`);
        }
        return result.data;
      },
      // Zod already handles defaults, so we can ignore .env file in production
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: TypeOrmConfigService,
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, 'default_IORedisModuleConnectionToken'],
      useFactory: (configService: ConfigService, redis: Redis) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000,
            limit: 3,
          },
          {
            name: 'medium',
            ttl: 10000,
            limit: 20,
          },
          {
            name: 'long',
            ttl: 60000,
            limit: 100,
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          genReqId: () => randomUUID(),
          level: configService.get('NODE_ENV') !== 'production' ? 'debug' : 'info',
          redact: ['req.headers.authorization'],
          transport:
            configService.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty' }
              : undefined,
        },
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, 'i18n/'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuditSubscriber,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
