import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { RedisHealthIndicator } from "./indicators/redis.health";
import { RedisModule } from "@nestjs-modules/ioredis";

@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
