import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isURL } from 'class-validator';

/**
 * Custom validator that accepts both:
 * - Full URLs (http://, https://)
 * - Relative paths starting with / (e.g., /uploads/videos/file.mp4)
 */
@ValidatorConstraint({ async: false })
class IsUrlOrPathConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const trimmedValue = value.trim();

    // Empty string is valid (handled by @IsOptional or @IsNotEmpty)
    if (trimmedValue === '') {
      return true;
    }

    // Check if it's a valid URL
    if (isURL(trimmedValue)) {
      return true;
    }

    // Check if it's a relative path starting with /
    if (trimmedValue.startsWith('/')) {
      return true;
    }

    return false;
  }

  defaultMessage(): string {
    return 'Must be a valid URL or a path starting with /';
  }
}

/**
 * Decorator for validating URL or relative path
 * Accepts:
 * - http://example.com/video.mp4
 * - https://example.com/video.mp4
 * - /uploads/videos/file.mp4
 */
export function IsUrlOrPath(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUrlOrPathConstraint,
    });
  };
}
