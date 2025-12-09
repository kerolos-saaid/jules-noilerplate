import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

/**
 * Validator constraint that checks if a field name is in the allowed list
 */
@ValidatorConstraint({ name: "isAllowedField", async: false })
export class IsAllowedFieldConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const [allowedFields] = args.constraints as [string[]];

    if (!value) {
      return true; // Allow undefined/null values (use @IsOptional for that)
    }

    if (typeof value !== "string") {
      return false;
    }

    // Support comma-separated fields (for sortBy)
    const fields = value.split(",").map((field) => field.trim());

    // Check if all fields are in the allowed list
    return fields.every((field) => allowedFields.includes(field));
  }

  defaultMessage(args: ValidationArguments): string {
    const [allowedFields] = args.constraints as [string[]];
    const property = args.property;
    return `${property} must be one of: ${allowedFields.join(", ")}`;
  }
}

/**
 * Custom validation decorator to check if field names are in an allowed list
 * @param allowedFields - Array of allowed field names
 * @param validationOptions - Optional validation options
 * @returns PropertyDecorator
 *
 * @example
 * class UsersQueryDto {
 *   @IsAllowedField(['username', 'email', 'createdAt'])
 *   sortBy?: string;
 * }
 */
export function IsAllowedField(
  allowedFields: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isAllowedField",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [allowedFields],
      options: validationOptions,
      validator: IsAllowedFieldConstraint,
    });
  };
}
