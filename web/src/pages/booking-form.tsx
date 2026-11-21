import { useState, type FormEvent } from 'react'
import { bookingsCreateBooking } from '@/client/sdk.gen'
import type { ApiError, EventType } from '@/client/types.gen'

interface BookingFormProps {
  eventType: EventType
  slot: string
  onSuccess: (guestName: string, start: string) => void
  onError: (message: string | null) => void
}

/** Достаёт понятное сообщение из тела ошибки API (400/404/409). */
function describeError(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const details = (error as ApiError).error
    if (details.details) {
      const messages = Object.values(details.details)
      if (messages.length > 0) return messages.join(' ')
    }
    if (details.message) return details.message
  }
  return 'Не удалось записаться. Попробуйте ещё раз.'
}

export function BookingForm({ eventType, slot, onSuccess, onError }: BookingFormProps) {
  const [guestName, setGuestName] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onError(null)
    setSending(true)
    const { data, error } = await bookingsCreateBooking({
      body: { eventTypeId: eventType.id, start: slot, guestName },
    })
    setSending(false)
    if (error || !data) {
      onError(describeError(error))
      return
    }
    onSuccess(data.booking.guestName, data.booking.start)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">Запись на «{eventType.title}»</h3>
      <p className="text-muted-foreground text-sm">Выбранное время: {slot.slice(11, 16)} (UTC+5)</p>
      <label htmlFor="guestName" className="text-sm font-medium">
        Имя гостя
      </label>
      <input
        id="guestName"
        value={guestName}
        onChange={(event) => setGuestName(event.target.value)}
        required
        className="rounded-md border px-3 py-2"
      />
      <button
        type="submit"
        disabled={sending}
        className="self-start rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {sending ? 'Отправляем…' : 'Записаться'}
      </button>
    </form>
  )
}
