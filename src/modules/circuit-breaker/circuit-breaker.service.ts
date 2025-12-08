import { Injectable, Logger } from "@nestjs/common";
import CircuitBreaker from "opossum";
import { CircuitBreakerOptions } from "./interfaces/circuit-breaker-options.interface";

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Create or get existing circuit breaker
   */
  createBreaker<T extends (...args: any[]) => Promise<any>>(
    name: string,
    action: T,
    options?: CircuitBreakerOptions,
  ): CircuitBreaker<Parameters<T>, ReturnType<T>> {
    if (this.breakers.has(name)) {
      return this.breakers.get(name) as CircuitBreaker<
        Parameters<T>,
        ReturnType<T>
      >;
    }

    const defaultOptions: CircuitBreakerOptions = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name,
      ...options,
    };

    const breaker = new CircuitBreaker(
      action,
      defaultOptions,
    ) as CircuitBreaker<Parameters<T>, ReturnType<T>>;

    // Event listeners for monitoring
    breaker.on("open", () => {
      this.logger.warn(`Circuit breaker [${name}] opened`);
    });

    breaker.on("halfOpen", () => {
      this.logger.log(`Circuit breaker [${name}] half-open`);
    });

    breaker.on("close", () => {
      this.logger.log(`Circuit breaker [${name}] closed`);
    });

    breaker.on("failure", (error) => {
      this.logger.error(`Circuit breaker [${name}] failure: ${error.message}`);
    });

    this.breakers.set(name, breaker);
    return breaker;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    name: string,
    action: (...args: any[]) => Promise<T>,
    options?: CircuitBreakerOptions,
    ...args: any[]
  ): Promise<T> {
    const breaker = this.createBreaker(name, action, options);
    return breaker.fire(...args);
  }

  /**
   * Get circuit breaker by name
   */
  getBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Clear all circuit breakers
   */
  clearAll(): void {
    this.breakers.forEach((breaker) => breaker.shutdown());
    this.breakers.clear();
  }
}
