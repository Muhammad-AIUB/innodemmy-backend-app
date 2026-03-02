/**
 * Structured content blocks for blog posts.
 * Shared type used across DTOs, service, and response mapping.
 */

export type BlogContentBlock =
  | { type: 'text'; value: string }
  | { type: 'image'; url: string; alt?: string }
  | { type: 'heading'; value: string }
  | { type: 'quote'; value: string };

export const ALLOWED_BLOCK_TYPES = [
  'text',
  'image',
  'heading',
  'quote',
] as const;

export type BlogContentBlockType = (typeof ALLOWED_BLOCK_TYPES)[number];
