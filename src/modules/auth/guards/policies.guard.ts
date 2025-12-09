import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AppAbility, CaslAbilityFactory } from "../casl/casl-ability.factory";
import { CHECK_POLICIES_KEY } from "../decorators/check-policies.decorator";
import { PolicyHandler } from "../interfaces/policy-handler.interface";
import { User } from "../../users/entities/user.entity";

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const request = context.switchToHttp().getRequest();
    const user = (request as { user: User }).user;
    const ability = this.caslAbilityFactory.createForUser(user);

    return Promise.resolve(
      policyHandlers.every((handler) =>
        this.execPolicyHandler(handler, ability),
      ),
    );
  }

  private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
    if (typeof handler === "function") {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
