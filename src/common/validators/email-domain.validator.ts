import { resolveMx } from 'dns/promises';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'yopmail.com',
]);

const mxCache = new Map<string, boolean>();

@ValidatorConstraint({ async: true })
class EmailDomainValidator implements ValidatorConstraintInterface {
  async validate(value: unknown): Promise<boolean> {
    if (typeof value !== 'string') {
      return false;
    }
    const email = value.trim().toLowerCase();
    const atIndex = email.lastIndexOf('@');
    if (atIndex < 0 || atIndex === email.length - 1) {
      return false;
    }

    const domain = email.slice(atIndex + 1);
    if (!domain) {
      return false;
    }

    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return false;
    }

    if (mxCache.has(domain)) {
      return mxCache.get(domain) === true;
    }

    try {
      const records = await resolveMx(domain);
      const ok = Array.isArray(records) && records.length > 0;
      mxCache.set(domain, ok);
      return ok;
    } catch {
      mxCache.set(domain, false);
      return false;
    }
  }

  defaultMessage(): string {
    return 'Please provide a real, non-disposable email address.';
  }
}

export function IsRealEmailDomain(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      constraints: [],
      validator: EmailDomainValidator,
    });
  };
}
