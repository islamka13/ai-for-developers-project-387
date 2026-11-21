import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BookingPage } from './booking-page'

const eventTypes = [
  { id: '1', title: 'Знакомство', description: 'Короткая встреча', durationMinutes: 30 },
]

type StubResponse = { body: unknown; status?: number }

/** fetch, который различает каталог, слоты и создание бронирования. */
function stubApi(handler: (url: string, method: string) => StubResponse) {
  const seen: Array<{ url: string; method: string; body?: unknown }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const request = input instanceof Request ? input : undefined
      const method = init?.method ?? request?.method ?? 'GET'
      const rawBody = init?.body ?? (request ? await request.text() : undefined)
      const body = rawBody ? (JSON.parse(String(rawBody)) as unknown) : undefined
      seen.push({ url, method, body })
      const { body: responseBody, status = 200 } = handler(url, method)
      return new Response(JSON.stringify(responseBody), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
  return seen
}

function stubCatalogAndSlots(bookingResponse?: StubResponse) {
  return stubApi((url, method) => {
    if (method === 'POST') {
      return bookingResponse ?? {
        body: {
          booking: {
            id: 'b1',
            eventTypeId: '1',
            start: '2026-11-23T09:00:00+05:00',
            guestName: 'Аня',
          },
        },
        status: 201,
      }
    }
    if (url.includes('/slots')) return { body: { slots: ['2026-11-23T09:00:00+05:00'] } }
    return { body: { eventTypes } }
  })
}

async function selectSlotAndFillName() {
  render(<BookingPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Знакомство/ }))
  fireEvent.click(await screen.findByRole('button', { name: '09:00' }))
  fireEvent.change(await screen.findByLabelText('Имя гостя'), {
    target: { value: 'Аня' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Страница записи: бронирование слота', () => {
  it('отправляет имя гостя и выбранный слот, затем показывает подтверждение', async () => {
    const seen = stubCatalogAndSlots()

    await selectSlotAndFillName()
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))

    const confirmation = await screen.findByRole('region', { name: 'Подтверждение записи' })
    expect(within(confirmation).getByText(/Вы записаны, Аня/)).toBeInTheDocument()
    expect(within(confirmation).getByText(/09:00/)).toBeInTheDocument()
    const post = seen.find((request) => request.method === 'POST')
    expect(post?.body).toMatchObject({
      eventTypeId: '1',
      start: '2026-11-23T09:00:00+05:00',
      guestName: 'Аня',
    })
  })

  it('при конфликте показывает сообщение и оставляет гостя на календаре', async () => {
    stubCatalogAndSlots({
      status: 409,
      body: {
        error: { code: 'slot_unavailable', message: 'Это время уже занято — выберите другой слот.' },
      },
    })

    await selectSlotAndFillName()
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))

    expect(
      await screen.findByRole('alert', { name: /ошибка записи/i }),
    ).toHaveTextContent('Это время уже занято — выберите другой слот.')
    expect(screen.getByRole('group', { name: 'Даты окна записи' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '09:00' })).toBeInTheDocument()
  })

  it('показывает ошибку валидации из details ответа 400', async () => {
    stubCatalogAndSlots({
      status: 400,
      body: {
        error: {
          code: 'validation_error',
          message: 'Проверьте данные записи.',
          details: { guestName: 'Укажите имя гостя' },
        },
      },
    })

    await selectSlotAndFillName()
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))

    expect(await screen.findByText('Укажите имя гостя')).toBeInTheDocument()
  })
})
