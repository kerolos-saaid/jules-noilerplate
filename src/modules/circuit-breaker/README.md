# Circuit Breaker Module

A NestJS module providing circuit breaker pattern implementation using [opossum](https://nodeshift.dev/opossum/).

## Overview

The circuit breaker pattern prevents cascading failures when calling external services. When failures reach a threshold, the circuit "opens" and subsequent calls fail immediately without attempting the operation.

### Circuit States

- **Closed**: Normal operation, requests pass through
- **Open**: Failures exceeded threshold, requests fail immediately
- **Half-Open**: Testing if service recovered, limited requests allowed

## Installation

Already installed in this project:
```bash
npm install opossum @types/opossum
```

## Usage

### Method 1: Direct Execution (Recommended)

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreakerService } from './modules/circuit-breaker';

@Injectable()
export class PaymentService {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  async processPayment(amount: number): Promise<any> {
    return this.circuitBreakerService.execute(
      'payment-gateway',
      async (amt: number) => {
        // Your external API call
        const response = await fetch('https://payment-api.com/charge', {
          method: 'POST',
          body: JSON.stringify({ amount: amt }),
        });
        return response.json();
      },
      {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
      },
      amount,
    );
  }
}
```

### Method 2: Reusable Circuit Breaker

```typescript
@Injectable()
export class EmailService {
  private emailBreaker: CircuitBreaker;

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    this.emailBreaker = this.circuitBreakerService.createBreaker(
      'email-service',
      this.sendEmailInternal.bind(this),
      {
        timeout: 10000,
        errorThresholdPercentage: 30,
      },
    );
  }

  async sendEmail(to: string, subject: string): Promise<void> {
    return this.emailBreaker.fire(to, subject);
  }

  private async sendEmailInternal(to: string, subject: string): Promise<void> {
    // Email sending logic
  }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | number | 3000 | Request timeout in milliseconds |
| `errorThresholdPercentage` | number | 50 | Error percentage to open circuit |
| `resetTimeout` | number | 30000 | Time before attempting half-open |
| `rollingCountTimeout` | number | 10000 | Time window for error calculation |
| `rollingCountBuckets` | number | 10 | Buckets for rolling count |
| `name` | string | - | Circuit breaker name for logging |

## Common Use Cases

### 1. External API Calls
```typescript
async fetchUserData(userId: string) {
  return this.circuitBreakerService.execute(
    'user-api',
    async (id) => {
      const response = await fetch(`https://api.example.com/users/${id}`);
      return response.json();
    },
    { timeout: 5000 },
    userId,
  );
}
```

### 2. Database Queries (External DB)
```typescript
async queryExternalDB(query: string) {
  return this.circuitBreakerService.execute(
    'external-db',
    async (q) => {
      // External database query
      return await externalDB.query(q);
    },
    { timeout: 10000, errorThresholdPercentage: 40 },
    query,
  );
}
```

### 3. Third-Party Services
```typescript
async uploadToS3(file: Buffer) {
  return this.circuitBreakerService.execute(
    's3-upload',
    async (fileBuffer) => {
      return await s3Client.upload(fileBuffer);
    },
    { timeout: 30000 },
    file,
  );
}
```

## Monitoring

The circuit breaker automatically logs state changes:

- `Circuit breaker [name] opened` - Too many failures
- `Circuit breaker [name] half-open` - Testing recovery
- `Circuit breaker [name] closed` - Service recovered
- `Circuit breaker [name] failure: error` - Individual failures

## Best Practices

1. **Use descriptive names** for circuit breakers
2. **Set appropriate timeouts** based on service SLA
3. **Adjust thresholds** based on service reliability
4. **Monitor logs** for circuit state changes
5. **Don't use for internal services** - only for external dependencies

## When NOT to Use

- Internal database queries (use connection pooling instead)
- Fast, reliable internal services
- Operations that must always execute
- File system operations

## Advanced: Getting Circuit Breaker Stats

```typescript
const breaker = this.circuitBreakerService.getBreaker('payment-gateway');
if (breaker) {
  console.log('Stats:', breaker.stats);
  console.log('Opened:', breaker.opened);
  console.log('Half-open:', breaker.halfOpen);
}
```

## Integration with Prometheus

Circuit breaker metrics are automatically exposed via the `/metrics` endpoint when using the PrometheusModule.
