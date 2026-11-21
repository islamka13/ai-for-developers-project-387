import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPage } from './admin-page'
import type { EventType } from '@/client/types.gen'

const seedTypes: EventType[] = [
  { id: '1', title: 'Знакомство', description: 'Короткая встреча', durationMinutes: 30 },
]

function stubFetch(handler: (url: string, method: string, body: string | null) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : null
      const url = request ? request.url : String(input)
      const method = init?.method ?? request?.method ?? 'GET'
      let body: string | null = null
      if (init?.body != null) {
        body = String(init.body)
      } else if (request && method !== 'GET') {
        body = await request.text()
      }
      return handler(url, method, body)
    }),
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** GET отдаёт каталог; POST по умолчанию создаёт тип с серверным id. */
function stubEventTypesApi(postResponse?: Response) {
  const created: EventType[] = []
  stubFetch((url, method, body) => {
    if (url.endsWith('/api/event-types') && method === 'GET') {
      return jsonResponse({ eventTypes: [...seedTypes, ...created] })
    }
    if (url.endsWith('/api/event-types') && method === 'POST') {
      if (postResponse) return postResponse
      const payload = JSON.parse(body ?? '{}') as Omit<EventType, 'id'>
      const eventType = { id: '3', ...payload }
      created.push(eventType)
      return jsonResponse({ eventType }, 201)
    }
    return new Response('Not Found', { status: 404 })
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Страница владельца: типы встреч', () => {
  it('показывает список существующих типов встреч', async () => {
    stubEventTypesApi()

    render(<AdminPage />)

    expect(await screen.findByRole('heading', { name: 'Знакомство' })).toBeInTheDocument()
    expect(screen.getByText('Короткая встреча')).toBeInTheDocument()
    expect(screen.getByText('30 мин')).toBeInTheDocument()
  })

  it('создаёт тип встречи через форму и показывает его в списке', async () => {
    stubEventTypesApi()
    const user = userEvent.setup()

    render(<AdminPage />)
    await screen.findByRole('heading', { name: 'Знакомство' })

    await user.type(screen.getByLabelText('Название'), 'Разбор резюме')
    await user.type(screen.getByLabelText('Описание'), 'Смотрим резюме и даём обратную связь.')
    await user.type(screen.getByLabelText('Длительность, мин'), '45')
    await user.click(screen.getByRole('button', { name: 'Создать тип встречи' }))

    expect(await screen.findByRole('heading', { name: 'Разбор резюме' })).toBeInTheDocument()
    expect(screen.getByText('45 мин')).toBeInTheDocument()
    // Форма очищается после успешного создания.
    expect(screen.getByLabelText('Название')).toHaveValue('')
  })

  it('показывает ошибки валидации у полей из ответа 400', async () => {
    stubEventTypesApi(
      jsonResponse(
        {
          error: {
            code: 'validation_error',
            message: 'Проверьте поля формы.',
            details: {
              title: 'Too small: expected string to have >=1 characters',
              durationMinutes: 'Too big: expected number to be <=540',
            },
          },
        },
        400,
      ),
    )
    const user = userEvent.setup()

    render(<AdminPage />)
    await screen.findByRole('heading', { name: 'Знакомство' })

    await user.type(screen.getByLabelText('Название'), 'x')
    await user.type(screen.getByLabelText('Описание'), 'y')
    await user.type(screen.getByLabelText('Длительность, мин'), '999')
    await user.click(screen.getByRole('button', { name: 'Создать тип встречи' }))

    expect(
      await screen.findByText('Too small: expected string to have >=1 characters'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Too big: expected number to be <=540'),
    ).toBeInTheDocument()
  })
})

type UpcomingBooking = {
  id: string
  eventTypeId: string
  start: string
  guestName: string
  eventType: { id: string; title: string; durationMinutes: number }
}

function stubBookingsApi(bookings: UpcomingBooking[]) {
  stubFetch((url, method) => {
    if (url.endsWith('/api/event-types') && method === 'GET') {
      return jsonResponse({ eventTypes: seedTypes })
    }
    if (url.endsWith('/api/bookings') && method === 'GET') {
      return jsonResponse({ bookings })
    }
    return new Response('Not Found', { status: 404 })
  })
}

describe('Страница владельца: предстоящие встречи', () => {
  it('показывает список встреч с временем, типом и именем гостя', async () => {
    stubBookingsApi([
      {
        id: 'b1',
        eventTypeId: '1',
        start: '2026-11-23T09:00:00+05:00',
        guestName: 'Аня',
        eventType: { id: '1', title: 'Знакомство', durationMinutes: 30 },
      },
    ])

    render(<AdminPage />)

    const section = await screen.findByRole('region', { name: 'Предстоящие встречи' })
    expect(within(section).getByText(/09:00–09:30/)).toBeInTheDocument()
    expect(within(section).getByText(/UTC\+5/)).toBeInTheDocument()
    expect(within(section).getByText('Знакомство')).toBeInTheDocument()
    expect(within(section).getByText('Аня')).toBeInTheDocument()
  })

  it('показывает понятное пустое состояние', async () => {
    stubBookingsApi([])

    render(<AdminPage />)

    const section = await screen.findByRole('region', { name: 'Предстоящие встречи' })
    expect(within(section).getByText('Пока нет предстоящих встреч')).toBeInTheDocument()
  })
})
