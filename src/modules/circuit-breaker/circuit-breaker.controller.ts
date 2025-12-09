import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("Demo - Circuit Breaker")
@Controller("demo/circuit-breaker")
export class CircuitBreakerController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  @Public()
  @Get("test")
  @ApiOperation({
    summary: "Test circuit breaker behavior",
    description:
      "Simulates external API calls with configurable failure rate. Call multiple times with high failRate (e.g., 80) to trigger circuit opening.",
  })
  @ApiQuery({
    name: "failRate",
    required: false,
    type: Number,
    description:
      "Failure rate percentage (0-100). Default: 50. Use 80+ to quickly open circuit.",
    example: 80,
  })
  async testCircuitBreaker(@Query("failRate") failRate?: string) {
    const rate = failRate ? parseInt(failRate, 10) : 50;

    try {
      const result = await this.circuitBreakerService.execute(
        "demo-api",
        async (failureRate: number) => {
          // Simulate random failures
          const random = Math.random() * 100;
          if (random < failureRate) {
            throw new Error("Simulated API failure");
          }

          // Simulate API delay
          await new Promise((resolve) => setTimeout(resolve, 100));

          return {
            success: true,
            message: "API call succeeded",
            timestamp: new Date().toISOString(),
          };
        },
        {
          timeout: 3000,
          errorThresholdPercentage: 50,
          resetTimeout: 10000, // 10 seconds for demo
        },
        rate,
      );

      return result;
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: err.message,
        circuitOpen: err.message.includes("breaker is open"),
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Public()
  @Get("stats")
  @ApiOperation({
    summary: "Get circuit breaker statistics",
    description: "View current state and stats of the demo circuit breaker",
  })
  getStats() {
    const breaker = this.circuitBreakerService.getBreaker("demo-api");

    if (!breaker) {
      return {
        message: "Circuit breaker not initialized yet. Call /test first.",
      };
    }

    return {
      name: "demo-api",
      state: breaker.opened
        ? "OPEN"
        : breaker.halfOpen
          ? "HALF_OPEN"
          : "CLOSED",
      stats: {
        fires: breaker.stats.fires,
        successes: breaker.stats.successes,
        failures: breaker.stats.failures,
        rejects: breaker.stats.rejects,
        timeouts: breaker.stats.timeouts,
        fallbacks: breaker.stats.fallbacks,
        latencyMean: breaker.stats.latencyMean,
      },
      opened: breaker.opened,
      halfOpen: breaker.halfOpen,
      warmUp: breaker.warmUp,
      volumeThreshold: breaker.volumeThreshold,
    };
  }

  @Public()
  @Get("reset")
  @ApiOperation({
    summary: "Reset circuit breaker",
    description: "Clear the demo circuit breaker and its stats",
  })
  reset() {
    const breaker = this.circuitBreakerService.getBreaker("demo-api");
    if (breaker) {
      breaker.shutdown();
    }
    return { message: "Circuit breaker reset successfully" };
  }
}
