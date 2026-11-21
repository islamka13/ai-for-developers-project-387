import { createFactory } from 'hono/factory';
import { zValidator } from '../generated/validator.ts';
import type { EventTypesListSlotsContext } from '../generated/index.context.ts';
import {
EventTypesListSlotsParams,
EventTypesListSlotsQueryParams,
EventTypesListSlotsResponse
} from '../generated/index.zod.ts'
import { eventTypeRepository } from '../event-types.ts'
import { bookingRepository } from '../bookings.ts'
import { clock } from '../clock.ts'
import { generateSlots, isInsideBookingWindow } from '../slots.ts'

const factory = createFactory();
export const eventTypesListSlotsHandlers = factory.createHandlers(
zValidator('param', EventTypesListSlotsParams),
zValidator('query', EventTypesListSlotsQueryParams),
zValidator('response', EventTypesListSlotsResponse),
async (c: EventTypesListSlotsContext) => {
    const { id } = c.req.valid('param')
    const { date } = c.req.valid('query')
    const eventType = eventTypeRepository.findById(id)
    if (!eventType) {
      return c.json(
        { error: { code: 'not_found', message: 'Тип встречи не найден' } },
        404,
      )
    }
    const now = clock.now()
    const slots = isInsideBookingWindow(date, now)
      ? generateSlots({
          date,
          durationMinutes: eventType.durationMinutes,
          now,
          bookings: bookingRepository.list(),
        })
      : []
    return c.json({ slots })
  },
);
