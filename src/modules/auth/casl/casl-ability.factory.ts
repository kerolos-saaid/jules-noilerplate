import {
  AbilityBuilder,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Injectable } from "@nestjs/common";

import { Role } from "../../users/enums/role.enum";
import { User } from "../../users/entities/user.entity";
import { Action } from "./enums/action.enum";

type Subjects = InferSubjects<typeof User> | "all";

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Admins can do anything
    if (user.roles.some((role) => role.name === Role.ADMIN)) {
      // 'manage' is a special keyword in CASL that represents "any" action.
      can(Action.MANAGE, "all");
    } else {
      // Non-admins can read everything
      can(Action.READ, "all");
    }

    // Users can update their own profiles
    can(Action.UPDATE, User, { id: user.id });

    return build({
      // Read about conditions: https://casl.js.org/v5/en/guide/subject-type-detection
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
