import type { Booking } from './bookings.ts'

/** Часовой пояс владельца: Asia/Qyzylorda, фиксированный UTC+5 (без DST). */
export const OWNER_UTC_OFFSET = '+05:00'
const OFFSET_MINUTES = 5 * 60

/** Рабочие часы владельца: 09:00–18:00 каждый день окна. */
const WORK_START_MINUTES = 9 * 60
const WORK_END_MINUTES = 18 * 60

/** Общая сетка стартов слотов. */
const GRID_MINUTES = 30

/** Окно записи: сегодня + 13 следующих дат (зона владельца). */
export const WINDOW_DAYS = 14

/** Текущая дата в зоне владельца (YYYY-MM-DD). */
export function todayInOwnerZone(now: Date): string {
  return new Date(now.getTime() + OFFSET_MINUTES * 60_000).toISOString().slice(0, 10)
}

/** Дата входит в окно записи: сегодня … сегодня + 13 дней (зона владельца). */
export function isInsideBookingWindow(date: string, now: Date): boolean {
  const first = todayInOwnerZone(now)
  const last = addDays(first, WINDOW_DAYS - 1)
  return date >= first && date <= last
}

function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

function toIsoWithOffset(date: string, minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mm = String(minutes % 60).padStart(2, '0')
  return `${date}T${hh}:${mm}:00${OWNER_UTC_OFFSET}`
}

/**
 * Проверка старта бронирования. Возвращает сообщение об ошибке или null,
 * если старт можно занимать. Использует те же правила, что генератор слотов.
 */
export function validateSlotStart(startIso: string, durationMinutes: number, now: Date): string | null {
  if (!startIso.endsWith(OWNER_UTC_OFFSET)) {
    return 'Укажите время в часовом поясе владельца календаря (UTC+5).'
  }
  const date = startIso.slice(0, 10)
  const clockTime = startIso.slice(11, 19)
  const [hours = 0, minutes = 0, seconds = 0] = clockTime.split(':').map(Number)
  if (seconds !== 0 || minutes % GRID_MINUTES !== 0) {
    return 'Старт должен быть по сетке 30 минут.'
  }
  const startMinutes = hours * 60 + minutes
  if (startMinutes < WORK_START_MINUTES || startMinutes + durationMinutes > WORK_END_MINUTES) {
    return 'Слот должен целиком помещаться в рабочие часы (09:00–18:00).'
  }
  if (!isInsideBookingWindow(date, now)) {
    return 'Старт вне окна записи.'
  }
  if (new Date(startIso).getTime() <= now.getTime()) {
    return 'Нельзя записаться на время, которое уже началось.'
  }
  return null
}

export interface SlotQuery {
  /** Дата в зоне владельца (YYYY-MM-DD). */
  date: string
  durationMinutes: number
  now: Date
  bookings: Booking[]
}

/**
 * Свободные старты слотов на дату: сетка 30 минут, слот целиком в рабочих
 * часах, старт строго позже текущего момента, без пересечений с бронированиями
 * (примыкание разрешено).
 */
export function generateSlots({ date, durationMinutes, now, bookings }: SlotQuery): string[] {
  const slots: string[] = []
  for (
    let start = WORK_START_MINUTES;
    start + durationMinutes <= WORK_END_MINUTES;
    start += GRID_MINUTES
  ) {
    const startIso = toIsoWithOffset(date, start)
    const startAt = new Date(startIso)
    if (startAt.getTime() <= now.getTime()) continue
    const endAt = new Date(startAt.getTime() + durationMinutes * 60_000)
    const busy = bookings.some((booking) => {
      const bookingEnd = new Date(booking.start.getTime() + booking.durationMinutes * 60_000)
      return booking.start < endAt && startAt < bookingEnd
    })
    if (!busy) slots.push(startIso)
  }
  return slots
}
