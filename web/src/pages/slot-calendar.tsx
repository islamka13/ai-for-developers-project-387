import { useEffect, useMemo, useState } from 'react'
import { eventTypesListSlots } from '@/client/sdk.gen'
import type { EventType } from '@/client/types.gen'

/** Часовой пояс владельца: Asia/Qyzylorda, фиксированный UTC+5. */
const OFFSET_MS = 5 * 60 * 60 * 1000

/** Окно записи: сегодня + 13 следующих дат (зона владельца). */
const WINDOW_DAYS = 14

function ownerDateISO(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10)
}

/** Даты окна записи в зоне владельца (YYYY-MM-DD). */
export function bookingWindowDates(now: Date = new Date()): string[] {
  const first = new Date(`${ownerDateISO(now)}T00:00:00Z`)
  return Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const day = new Date(first)
    day.setUTCDate(first.getUTCDate() + i)
    return day.toISOString().slice(0, 10)
  })
}

function formatDateLabel(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

/** «2026-11-23T09:30:00+05:00» → «09:30». */
function formatSlotLabel(slot: string): string {
  return slot.slice(11, 16)
}

type SlotsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; slots: string[] }

interface SlotCalendarProps {
  eventType: EventType
  selectedSlot?: string | null
  onSlotSelect?: (slot: string) => void
  onDateChange?: () => void
}

export function SlotCalendar({
  eventType,
  selectedSlot,
  onSlotSelect,
  onDateChange,
}: SlotCalendarProps) {
  const dates = useMemo(() => bookingWindowDates(), [])
  const [selectedDate, setSelectedDate] = useState(dates[0])
  const [state, setState] = useState<SlotsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    void (async () => {
      const { data, error } = await eventTypesListSlots({
        path: { id: String(eventType.id) },
        query: { date: selectedDate },
      })
      if (cancelled) return
      if (error || !data) {
        setState({ status: 'error' })
      } else {
        setState({ status: 'ready', slots: data.slots })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [eventType.id, selectedDate])

  return (
    <section aria-label={`Календарь: ${eventType.title}`} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Свободное время: {eventType.title}</h2>
      <p className="text-muted-foreground text-sm">
        Время указано в часовом поясе владельца календаря (UTC+5).
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Даты окна записи">
        {dates.map((date) => (
          <button
            key={date}
            type="button"
            aria-pressed={date === selectedDate}
            onClick={() => {
              setSelectedDate(date)
              onDateChange?.()
            }}
            className={`rounded-md border px-3 py-2 text-sm ${
              date === selectedDate ? 'bg-primary text-primary-foreground' : 'bg-background'
            }`}
          >
            {formatDateLabel(date)}
          </button>
        ))}
      </div>
      {state.status === 'loading' && <p>Загружаем свободные слоты…</p>}
      {state.status === 'error' && (
        <p role="alert">Не удалось загрузить слоты. Попробуйте выбрать дату ещё раз.</p>
      )}
      {state.status === 'ready' && state.slots.length === 0 && (
        <p>На эту дату свободных слотов нет.</p>
      )}
      {state.status === 'ready' && state.slots.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Свободные слоты">
          {state.slots.map((slot) => (
            <li key={slot}>
              <button
                type="button"
                aria-pressed={slot === selectedSlot}
                onClick={() => onSlotSelect?.(slot)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  slot === selectedSlot ? 'bg-primary text-primary-foreground' : 'bg-background'
                }`}
              >
                {formatSlotLabel(slot)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
