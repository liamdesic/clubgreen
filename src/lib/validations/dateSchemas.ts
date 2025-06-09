import { z } from 'zod';

export const dateSchema = z.union([
  z.string().datetime(),
  z.date().transform(d => d.toISOString())
]);

export const nullableDateSchema = z.union([
  z.string().datetime().nullable(),
  z.date().transform(d => d.toISOString()).nullable()
]).transform(val => val ?? null);
