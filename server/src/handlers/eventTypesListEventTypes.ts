import { createFactory } from 'hono/factory';
import { zValidator } from '../generated/validator.ts';
import type { EventTypesListEventTypesContext } from '../generated/index.context.ts';
import {
EventTypesListEventTypesResponse
} from '../generated/index.zod.ts'
import { eventTypeRepository } from '../event-types.ts'

const factory = createFactory();
export const eventTypesListEventTypesHandlers = factory.createHandlers(
zValidator('response', EventTypesListEventTypesResponse),
async (c: EventTypesListEventTypesContext) => {
    return c.json({ eventTypes: eventTypeRepository.list() })
  },
);
