import { createFactory } from 'hono/factory';
import { zValidator } from '../generated/validator.ts';
import type { BookingsListBookingsContext } from '../generated/index.context.ts';
import {
BookingsListBookingsResponse
} from '../generated/index.zod.ts'
import { bookingRepository } from '../bookings.ts'
import { eventTypeRepository } from '../event-types.ts'
import { clock } from '../clock.ts'
import { OWNER_UTC_OFFSET } from '../slots.ts'

const factory = createFactory();

/** Дата в зоне владельца с явным офсетом +05:00. */
function toOwnerIso(date: Date): string {
  const shifted = new Date(date.getTime() + 5 * 60 * 60 * 1000)
  return `${shifted.toISOString().slice(0, 19)}${OWNER_UTC_OFFSET}`
}

export const bookingsListBookingsHandlers = factory.createHandlers(
zValidator('response', BookingsListBookingsResponse),
async (c: BookingsListBookingsContext) => {
    const now = clock.now().getTime()
    const bookings = bookingRepository
      .list()
      .filter((booking) => booking.start.getTime() + booking.durationMinutes * 60_000 > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .flatMap((booking) => {
        const eventType = eventTypeRepository.findById(booking.eventTypeId)
        if (!eventType) return []
        return [
          {
            id: booking.id,
            eventTypeId: booking.eventTypeId,
            start: toOwnerIso(booking.start),
            guestName: booking.guestName,
            ...(booking.topic ? { topic: booking.topic } : {}),
            eventType: {
              id: eventType.id,
              title: eventType.title,
              durationMinutes: eventType.durationMinutes,
            },
          },
        ]
      })
    return c.json({ bookings })
  },
);
