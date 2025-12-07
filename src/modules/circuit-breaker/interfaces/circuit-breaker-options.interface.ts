export interface CircuitBreakerOptions {
  /**
   * The time in milliseconds that action should be allowed to execute before timing out
   * @default 3000
   */
  timeout?: number;

  /**
   * The error percentage at which to open the circuit
   * @default 50
   */
  errorThresholdPercentage?: number;

  /**
   * The time in milliseconds to wait before setting the breaker to halfOpen state
   * @default 30000
   */
  resetTimeout?: number;

  /**
   * The time window in milliseconds in which the error threshold is checked
   * @default 10000
   */
  rollingCountTimeout?: number;

  /**
   * The number of buckets to use for the rolling count
   * @default 10
   */
  rollingCountBuckets?: number;

  /**
   * Name of the circuit breaker for logging and monitoring
   */
  name?: string;

  /**
   * Whether to enable the circuit breaker
   * @default true
   */
  enabled?: boolean;
}
