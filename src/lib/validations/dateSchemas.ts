import { z } from 'zod';

export const dateSchema = z.union([
  z.string().datetime(),
  z.date().transform(d => d.toISOString())
]);

export const nullableDateSchema = z.union([
  z.null(),
  z.undefined(),
  z.string().datetime(),
  z.date().transform(d => d.toISOString())
]).transform(val => {
  if (val === null || val === undefined) return null;
  // Handle Supabase timestamp format (e.g. "2025-06-11 13:13:58.091256+00")
  if (typeof val === 'string' && val.includes(' ')) {
    return new Date(val).toISOString();
  }
  return val;
});
