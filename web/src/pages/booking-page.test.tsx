import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BookingPage } from './booking-page'

function stubFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      ok
        ? new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response('Internal Server Error', { status: 500 }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Страница записи: каталог типов встреч', () => {
  it('показывает типы встреч, загруженные через SDK', async () => {
    stubFetch({
      eventTypes: [
        { id: '1', title: 'Знакомство', description: 'Короткая встреча', durationMinutes: 30 },
        { id: '2', title: 'Консультация', description: 'Развёрнутая консультация', durationMinutes: 60 },
      ],
    })

    render(<BookingPage />)

    expect(screen.getByText('Загружаем типы встреч…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Знакомство' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Консультация' })).toBeInTheDocument()
    expect(screen.getByText('30 мин')).toBeInTheDocument()
    expect(screen.getByText('60 мин')).toBeInTheDocument()
  })

  it('показывает ошибку, если каталог не загрузился', async () => {
    stubFetch(null, false)

    render(<BookingPage />)

    expect(
      await screen.findByText('Не удалось загрузить типы встреч. Попробуйте обновить страницу.'),
    ).toBeInTheDocument()
  })

  it('показывает пустое состояние, когда типов встреч нет', async () => {
    stubFetch({ eventTypes: [] })

    render(<BookingPage />)

    expect(await screen.findByText('Пока нет доступных типов встреч.')).toBeInTheDocument()
  })
})

/** fetch, который отвечает и за каталог, и за слоты в зависимости от URL. */
function stubFetchRouting(handler: (url: string) => { body: unknown; ok?: boolean }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const { body, ok = true } = handler(url)
      return ok
        ? new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response('Internal Server Error', { status: 500 })
    }),
  )
}

const eventTypes = [
  { id: 1, title: 'Знакомство', description: 'Короткая встреча', durationMinutes: 30 },
]

describe('Страница записи: календарь свободных слотов', () => {
  it('после выбора типа встречи показывает 14 дат окна, слоты выбранной даты и подпись зоны', async () => {
    stubFetchRouting((url) =>
      url.includes('/slots')
        ? { body: { slots: ['2026-11-23T09:00:00+05:00', '2026-11-23T09:30:00+05:00'] } }
        : { body: { eventTypes } },
    )

    render(<BookingPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Знакомство/ }))

    expect(
      screen.getByText('Время указано в часовом поясе владельца календаря (UTC+5).'),
    ).toBeInTheDocument()
    const dateGroup = screen.getByRole('group', { name: 'Даты окна записи' })
    expect(within(dateGroup).getAllByRole('button')).toHaveLength(14)

    expect(await screen.findByRole('button', { name: '09:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '09:30' })).toBeInTheDocument()
  })

  it('запрашивает слоты заново при выборе другой даты', async () => {
    const requested: string[] = []
    stubFetchRouting((url) => {
      if (url.includes('/slots')) {
        requested.push(url)
        return { body: { slots: ['2026-11-24T10:00:00+05:00'] } }
      }
      return { body: { eventTypes } }
    })

    render(<BookingPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Знакомство/ }))
    await screen.findByRole('button', { name: '10:00' })

    const dateGroup = screen.getByRole('group', { name: 'Даты окна записи' })
    fireEvent.click(within(dateGroup).getAllByRole('button')[1])

    await screen.findByRole('button', { name: '10:00' })
    expect(requested).toHaveLength(2)
    expect(new URL(requested[1]).searchParams.get('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('показывает пустое состояние, когда свободных слотов нет', async () => {
    stubFetchRouting((url) =>
      url.includes('/slots') ? { body: { slots: [] } } : { body: { eventTypes } },
    )

    render(<BookingPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Знакомство/ }))

    expect(await screen.findByText('На эту дату свободных слотов нет.')).toBeInTheDocument()
  })

  it('показывает ошибку, если слоты не загрузились', async () => {
    stubFetchRouting((url) =>
      url.includes('/slots') ? { body: null, ok: false } : { body: { eventTypes } },
    )

    render(<BookingPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Знакомство/ }))

    expect(
      await screen.findByText('Не удалось загрузить слоты. Попробуйте выбрать дату ещё раз.'),
    ).toBeInTheDocument()
  })
})
