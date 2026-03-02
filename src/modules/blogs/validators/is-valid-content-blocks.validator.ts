import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ALLOWED_BLOCK_TYPES } from '../types/blog-content-block.type';

/**
 * Custom validator that ensures each element in the array
 * is a valid BlogContentBlock with the correct shape.
 */
export function IsValidContentBlocks(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isValidContentBlocks',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (!Array.isArray(value)) return false;

          return value.every((block: unknown) => {
            if (typeof block !== 'object' || block === null) return false;

            const b = block as Record<string, unknown>;

            if (
              typeof b.type !== 'string' ||
              !ALLOWED_BLOCK_TYPES.includes(
                b.type as (typeof ALLOWED_BLOCK_TYPES)[number],
              )
            ) {
              return false;
            }

            switch (b.type) {
              case 'text':
              case 'heading':
              case 'quote':
                return typeof b.value === 'string' && b.value.length > 0;
              case 'image':
                return (
                  typeof b.url === 'string' &&
                  b.url.length > 0 &&
                  (b.alt === undefined || typeof b.alt === 'string')
                );
              default:
                return false;
            }
          });
        },

        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be an array of valid content blocks (allowed types: ${ALLOWED_BLOCK_TYPES.join(', ')})`;
        },
      },
    });
  };
}
