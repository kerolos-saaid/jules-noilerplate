import { Controller, Get, Param, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Throttle } from '@nestjs/throttler';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { Action } from '../auth/casl/enums/action.enum';
import { AppAbility } from '../auth/casl/casl-ability.factory';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersQueryDto } from './dto/users-query.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

/**
 * The users controller is responsible for handling all incoming requests for the users resource.
 *
 * @remarks
 * This controller is protected by the `JwtAuthGuard` and the `PoliciesGuard`.
 * The `JwtAuthGuard` ensures that the user is authenticated, and the `PoliciesGuard`
 * ensures that the user has the correct permissions to access the resource.
 *
 * The `@Throttle` decorator is used to apply rate-limiting to the entire controller.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Throttle({ medium: { limit: 10, ttl: 60000 } })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * This endpoint returns all users with pagination, sorting, and filtering.
   *
   * @remarks
   * The `@CheckPolicies` decorator is used to check if the user has the `read` permission on all resources.
   * Accepts query parameters for pagination (page, limit), sorting (sortBy, sortOrder), and filtering (filters).
   */
  @Get()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.READ, 'all'))
  findAll(@Query() queryDto: UsersQueryDto): Promise<PaginatedResponse<User>> {
    return this.usersService.findAll(queryDto);
  }

  /**
   * This endpoint returns a single user by id.
   *
   * @remarks
   * The `@CheckPolicies` decorator is used to check if the user has the `read` permission on the `User` resource.
   */
  @Get(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.READ, User))
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }
}
