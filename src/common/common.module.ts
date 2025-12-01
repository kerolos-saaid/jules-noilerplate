import { Global, Module } from '@nestjs/common';
import { QueryBuilderService } from './services/query-builder.service';

/**
 * CommonModule provides shared utilities and services across the application.
 * Marked as @Global() to make QueryBuilderService available without explicit imports.
 */
@Global()
@Module({
  providers: [QueryBuilderService],
  exports: [QueryBuilderService],
})
export class CommonModule {}
