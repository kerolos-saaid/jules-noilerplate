import { Injectable } from '@nestjs/common';
import { CircuitBreakerService } from '../circuit-breaker.service';

/**
 * Example service demonstrating circuit breaker usage
 */
@Injectable()
export class ExampleService {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  /**
   * Example 1: Using execute method directly
   */
  async callExternalAPI(userId: string): Promise<any> {
    return this.circuitBreakerService.execute(
      'external-api',
      async (id: string) => {
        // Simulate external API call
        const response = await fetch(`https://api.example.com/users/${id}`);
        if (!response.ok) throw new Error('API call failed');
        return response.json();
      },
      {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
      },
      userId,
    );
  }

  /**
   * Example 2: Creating a reusable circuit breaker
   */
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const breaker = this.circuitBreakerService.createBreaker(
      'email-service',
      async (emailTo: string, emailSubject: string, emailBody: string) => {
        // Simulate email sending
        console.log(`Sending email to ${emailTo}`);
        // Your email logic here
      },
      {
        timeout: 10000,
        errorThresholdPercentage: 30,
      },
    );

    await breaker.fire(to, subject, body);
  }

  /**
   * Example 3: Payment gateway with circuit breaker
   */
  async processPayment(amount: number, currency: string): Promise<any> {
    return this.circuitBreakerService.execute(
      'payment-gateway',
      async (amt: number, curr: string) => {
        // Simulate payment processing
        if (Math.random() > 0.7) {
          throw new Error('Payment gateway timeout');
        }
        return { success: true, amount: amt, currency: curr };
      },
      {
        timeout: 15000,
        errorThresholdPercentage: 40,
        resetTimeout: 60000,
      },
      amount,
      currency,
    );
  }
}
