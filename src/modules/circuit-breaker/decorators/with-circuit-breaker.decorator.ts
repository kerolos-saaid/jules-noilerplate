import { CircuitBreakerOptions } from "../interfaces/circuit-breaker-options.interface";

/**
 * Decorator to mark methods that should use circuit breaker
 * This is a metadata decorator - actual implementation is in the service
 */
export const CIRCUIT_BREAKER_METADATA = "circuit-breaker:options";

export function WithCircuitBreaker(
  options?: CircuitBreakerOptions,
): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      CIRCUIT_BREAKER_METADATA,
      options || {},
      target,
      propertyKey,
    );
    return descriptor;
  };
}
