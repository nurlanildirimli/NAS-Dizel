import { z } from 'zod';

const scalarValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const reportRowSchema = z.record(z.string(), scalarValueSchema);
export const reportRowsSchema = z.array(reportRowSchema);
export const exportRowsSchema = z.array(reportRowSchema);
