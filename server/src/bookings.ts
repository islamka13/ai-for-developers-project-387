/**
 * Бронирование: слот, занятый гостем.
 */
export interface Booking {
  id: string
  eventTypeId: string
  start: Date
  durationMinutes: number
  guestName: string
  topic?: string
}

/**
 * In-memory репозиторий бронирований.
 * Хранение не переживает перезапуск (ограничение из README.md).
 */
export interface BookingRepository {
  list(): Booking[]
  /** Добавляет бронирование только если его интервал ни с чем не пересекается. */
  tryAdd(booking: Booking): boolean
  /** Безусловная запись — используется тестами и сидами. */
  add(booking: Booking): void
  /** Очистка хранилища между тестами. */
  clear(): void
}

export function createBookingRepository(seed: Booking[] = []): BookingRepository {
  const bookings = [...seed]
  return {
    list: () => [...bookings],
    tryAdd: (booking) => {
      const end = booking.start.getTime() + booking.durationMinutes * 60_000
      const overlaps = bookings.some((existing) => {
        const existingEnd = existing.start.getTime() + existing.durationMinutes * 60_000
        return existing.start.getTime() < end && booking.start.getTime() < existingEnd
      })
      if (overlaps) return false
      // Проверка и запись идут синхронно, без await: event loop не допускает гонки.
      bookings.push(booking)
      return true
    },
    add: (booking) => {
      bookings.push(booking)
    },
    clear: () => {
      bookings.length = 0
    },
  }
}

export const bookingRepository = createBookingRepository()
