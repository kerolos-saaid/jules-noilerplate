import { Module } from '@nestjs/common';
import { SeedingService } from './seeding.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [SeedingService],
})
export class SeedingModule {}
