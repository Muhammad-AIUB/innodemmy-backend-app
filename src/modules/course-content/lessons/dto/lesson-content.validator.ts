import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { LessonContentBlock } from './lesson-content-block.type';

const LESSON_CONTENT_TYPES = ['text', 'video', 'resource'] as const;

type LessonContentType = (typeof LESSON_CONTENT_TYPES)[number];

const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidUrlString = (value: unknown): value is string => {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    // URL parsing is enough here; protocol restrictions are intentionally left to product rules.
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const hasExactKeys = (
  value: Record<string, unknown>,
  keys: string[],
): boolean =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => hasOwn(value, key));

const isTextBlock = (value: Record<string, unknown>): boolean =>
  hasExactKeys(value, ['type', 'value']) && isNonEmptyString(value.value);

const isVideoBlock = (value: Record<string, unknown>): boolean =>
  hasExactKeys(value, ['type', 'url']) && isValidUrlString(value.url);

const isResourceBlock = (value: Record<string, unknown>): boolean =>
  hasExactKeys(value, ['type', 'url', 'label']) &&
  isValidUrlString(value.url) &&
  isNonEmptyString(value.label);

const isLessonContentType = (value: unknown): value is LessonContentType =>
  typeof value === 'string' &&
  (LESSON_CONTENT_TYPES as readonly string[]).includes(value);

const isLessonContentBlock = (value: unknown): value is LessonContentBlock => {
  if (!isRecord(value) || !isLessonContentType(value.type)) {
    return false;
  }

  switch (value.type) {
    case 'text':
      return isTextBlock(value);
    case 'video':
      return isVideoBlock(value);
    case 'resource':
      return isResourceBlock(value);
    default:
      return false;
  }
};

@ValidatorConstraint({ name: 'IsLessonContentBlocks', async: false })
class LessonContentBlocksValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined) {
      return true;
    }

    if (!Array.isArray(value)) {
      return false;
    }

    return value.every((block) => isLessonContentBlock(block));
  }

  defaultMessage(_args?: ValidationArguments): string {
    return 'content must be an array of valid lesson blocks (text, video, resource).';
  }
}

export function IsLessonContentBlocks(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      constraints: [],
      validator: LessonContentBlocksValidator,
    });
  };
}
