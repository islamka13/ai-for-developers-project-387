import { createFactory } from 'hono/factory';
import { zValidator } from '../generated/validator.ts';
import {
EventTypesCreateEventTypeBody
} from '../generated/index.zod.ts'
import { eventTypeRepository } from '../event-types.ts'

const factory = createFactory();
export const eventTypesCreateEventTypeHandlers = factory.createHandlers(
zValidator('json', EventTypesCreateEventTypeBody, (result, c) => {
    if (!result.success) {
      const details: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? 'body')
        if (!(field in details)) details[field] = issue.message
      }
      return c.json(
        {
          error: {
            code: 'validation_error',
            message: 'Проверьте поля формы.',
            details,
          },
        },
        400,
      )
    }
  }),
async (c) => {
    const eventType = eventTypeRepository.create(c.req.valid('json'))
    return c.json({ eventType }, 201)
  },
);
