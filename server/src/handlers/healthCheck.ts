import { createFactory } from 'hono/factory';
import { zValidator } from '../generated/validator.ts';
import type { HealthCheckContext } from '../generated/index.context.ts';
import {
HealthCheckResponse
} from '../generated/index.zod.ts'

const factory = createFactory();
export const healthCheckHandlers = factory.createHandlers(
zValidator('response', HealthCheckResponse),
async (c: HealthCheckContext) => {
    return c.json({ status: 'ok' })
  },
);
