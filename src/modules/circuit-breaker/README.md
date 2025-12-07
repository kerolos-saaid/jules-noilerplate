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

### 1. Payment Gateway
```typescript
async processPayment(amount: number, currency: string) {
  return this.circuitBreakerService.execute(
    'payment-gateway',
    async (amt, curr) => {
      const response = await fetch('https://payment-api.com/charge', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, currency: curr }),
      });
      return response.json();
    },
    { timeout: 15000, errorThresholdPercentage: 40 },
    amount,
    currency,
  );
}
```

### 2. Email Service
```typescript
async sendEmail(to: string, subject: string, body: string) {
  return this.circuitBreakerService.execute(
    'email-service',
    async (emailTo, emailSubject, emailBody) => {
      await emailProvider.send({ to: emailTo, subject: emailSubject, body: emailBody });
    },
    { timeout: 10000, errorThresholdPercentage: 30 },
    to,
    subject,
    body,
  );
}
```

### 3. Third-Party API
```typescript
async getWeatherData(city: string) {
  return this.circuitBreakerService.execute(
    'weather-api',
    async (cityName) => {
      const response = await fetch(`https://api.weather.com/data?city=${cityName}`);
      return response.json();
    },
    { timeout: 5000 },
    city,
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

- **Internal database queries** - Use TypeORM connection pooling instead
- **Fast, reliable internal services** - No need for circuit breaker
- **Operations that must always execute** - Circuit breaker will fail fast
- **File system operations** - Usually reliable, no need for protection

## Important Notes

⚠️ **Circuit breaker does NOT work automatically!**

You must explicitly wrap your external calls with `circuitBreakerService.execute()` or create a breaker with `createBreaker()`.

✅ **Use circuit breaker for:**
- Payment gateways (Stripe, PayPal, etc.)
- Email/SMS services (SendGrid, Twilio, etc.)
- Third-party APIs (weather, geocoding, etc.)
- External company databases/services
- Cloud storage (S3, Azure Blob, etc.)

❌ **Don't use circuit breaker for:**
- Your main PostgreSQL database
- Your Redis cache
- Internal microservices
- File system operations

## Testing & Demo

The module includes demo endpoints for testing circuit breaker behavior:

### Available Endpoints

1. **Test Circuit Breaker**
   ```bash
   GET /api/v1/demo/circuit-breaker/test?failRate=80
   ```
   Simulates external API calls with configurable failure rate (0-100)

2. **View Statistics**
   ```bash
   GET /api/v1/demo/circuit-breaker/stats
   ```
   Shows current circuit state and statistics

3. **Reset Circuit**
   ```bash
   GET /api/v1/demo/circuit-breaker/reset
   ```
   Clears the demo circuit breaker

### How to Test

1. Start the server: `npm run start:dev`
2. Call test endpoint with high failure rate:
   ```bash
   curl "http://localhost:3000/api/v1/demo/circuit-breaker/test?failRate=80"
   ```
3. Repeat 5-10 times quickly to trigger circuit opening
4. Check stats to see circuit state:
   ```bash
   curl http://localhost:3000/api/v1/demo/circuit-breaker/stats
   ```
5. Watch logs for: `Circuit breaker [demo-api] opened`

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
