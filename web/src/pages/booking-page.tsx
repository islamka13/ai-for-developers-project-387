import { useEffect, useState } from 'react'
import '@/api'
import { eventTypesListEventTypes } from '@/client/sdk.gen'
import type { EventType } from '@/client/types.gen'
import { BookingForm } from './booking-form'
import { SlotCalendar } from './slot-calendar'

type Confirmation = { guestName: string; start: string }

function formatConfirmationDate(start: string): string {
  const [year, month, day] = start.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

type CatalogState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; eventTypes: EventType[] }

export function BookingPage() {
  const [state, setState] = useState<CatalogState>({ status: 'loading' })
  const [selected, setSelected] = useState<EventType | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data, error } = await eventTypesListEventTypes()
      if (cancelled) return
      if (error || !data) {
        setState({ status: 'error' })
      } else {
        setState({ status: 'ready', eventTypes: data.eventTypes })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Страница записи</h1>
      <p className="text-muted-foreground">
        Выберите подходящий тип встречи и свободный слот.
      </p>
      {state.status === 'loading' && <p>Загружаем типы встреч…</p>}
      {state.status === 'error' && (
        <p role="alert">Не удалось загрузить типы встреч. Попробуйте обновить страницу.</p>
      )}
      {state.status === 'ready' && state.eventTypes.length === 0 && (
        <p>Пока нет доступных типов встреч.</p>
      )}
      {state.status === 'ready' && state.eventTypes.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {state.eventTypes.map((eventType) => (
            <li key={eventType.id}>
              <button
                type="button"
                aria-pressed={selected?.id === eventType.id}
                onClick={() => {
                  setSelected(eventType)
                  setSelectedSlot(null)
                  setBookingError(null)
                  setConfirmation(null)
                }}
                className={`w-full rounded-lg border p-4 text-left ${
                  selected?.id === eventType.id ? 'border-primary ring-2 ring-primary' : ''
                }`}
              >
                <h2 className="text-lg font-semibold">{eventType.title}</h2>
                <p className="text-muted-foreground text-sm">{eventType.description}</p>
                <p className="mt-2 text-sm font-medium">{eventType.durationMinutes} мин</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <SlotCalendar
          eventType={selected}
          selectedSlot={selectedSlot}
          onSlotSelect={(slot) => {
            setSelectedSlot(slot)
            setBookingError(null)
            setConfirmation(null)
          }}
          onDateChange={() => {
            setSelectedSlot(null)
            setBookingError(null)
          }}
        />
      )}
      {bookingError && (
        <p role="alert" aria-label="Ошибка записи" className="text-destructive text-sm">
          {bookingError}
        </p>
      )}
      {selected && selectedSlot && !confirmation && (
        <BookingForm
          eventType={selected}
          slot={selectedSlot}
          onSuccess={(guestName, start) => setConfirmation({ guestName, start })}
          onError={setBookingError}
        />
      )}
      {confirmation && (
        <section
          aria-label="Подтверждение записи"
          className="rounded-lg border border-primary p-4"
        >
          <h2 className="text-lg font-semibold">
            Вы записаны, {confirmation.guestName}!
          </h2>
          <p className="text-muted-foreground text-sm">
            {formatConfirmationDate(confirmation.start)} в {confirmation.start.slice(11, 16)}{' '}
            (UTC+5). До встречи!
          </p>
          <button
            type="button"
            className="mt-3 rounded-md border px-3 py-2 text-sm"
            onClick={() => {
              setConfirmation(null)
              setSelectedSlot(null)
            }}
          >
            Записаться на другое время
          </button>
        </section>
      )}
    </main>
  )
}
