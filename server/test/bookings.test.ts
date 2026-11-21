import path from 'node:path'
import SwaggerParser from '@apidevtools/swagger-parser'
import AjvModule from 'ajv'
import addFormatsModule from 'ajv-formats'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.ts'
import { bookingRepository } from '../src/bookings.ts'
import { clock } from '../src/clock.ts'

const Ajv = AjvModule.default
const addFormats = addFormatsModule.default

const SPEC_PATH = path.resolve(__dirname, '../../contract/openapi.yaml')

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let spec: any

beforeAll(async () => {
  spec = await SwaggerParser.dereference(SPEC_PATH)
})

function responseValidator(status: number) {
  const response = spec.paths['/api/bookings']?.post?.responses?.[status]
  if (!response) throw new Error(`Код ${status} не описан для POST /api/bookings`)
  const schema = response.content?.['application/json']?.schema
  return schema ? ajv.compile(schema) : null
}

const systemNow = clock.now

function freezeNow(iso: string) {
  clock.now = () => new Date(iso)
}

afterEach(() => {
  clock.now = systemNow
  bookingRepository.clear()
})

type BookingBody = {
  eventTypeId: string
  start: string
  guestName: string
  topic?: string
}

type CreatedBody = {
  booking: { id: string; eventTypeId: string; start: string; guestName: string; topic?: string }
}

type ErrorBody = {
  error: { code: string; message: string; details?: Record<string, string> }
}

async function postBooking(body: BookingBody) {
  const response = await app.request('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return {
    status: response.status,
    body: (await response.json()) as CreatedBody & ErrorBody,
  }
}

const validBooking: BookingBody = {
  eventTypeId: '1',
  start: '2026-11-23T09:00:00+05:00',
  guestName: 'Аня',
}

describe('POST /api/bookings', () => {
  it('создаёт бронирование и убирает занятый слот из календаря', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await postBooking(validBooking)

    expect(status).toBe(201)
    expect(body.booking?.id).toEqual(expect.any(String))
    expect(body.booking).toMatchObject({
      eventTypeId: '1',
      start: '2026-11-23T09:00:00+05:00',
      guestName: 'Аня',
    })

    const slotsResponse = await app.request('/api/event-types/1/slots?date=2026-11-23')
    const slots = (await slotsResponse.json()) as { slots: string[] }
    expect(slots.slots).not.toContain('2026-11-23T09:00:00+05:00')
  })

  it('не возвращает тему, когда гость её не указал', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await postBooking(validBooking)

    expect(status).toBe(201)
    expect(body.booking).not.toHaveProperty('topic')
  })

  it.each(['', '   \t '])('трактует тему %j как отсутствие', async (topic) => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await postBooking({ ...validBooking, topic })

    expect(status).toBe(201)
    expect(body.booking).not.toHaveProperty('topic')
  })

  it.each([
    { name: 'обычную тему', topic: 'Обсуждение дизайна' },
    { name: 'тему длиной ровно 200 символов', topic: 'т'.repeat(200) },
  ])('сохраняет и возвращает $name в ответе на создание бронирования', async ({ topic }) => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await postBooking({ ...validBooking, topic })

    expect(status).toBe(201)
    expect(body.booking?.topic).toBe(topic)

    const slotsResponse = await app.request('/api/event-types/1/slots?date=2026-11-23')
    const slots = (await slotsResponse.json()) as { slots: string[] }
    expect(slots.slots).not.toContain('2026-11-23T09:00:00+05:00')
  })

  it('отвергает тему длиннее 200 символов до создания бронирования и оставляет слот свободным', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await postBooking({
      ...validBooking,
      topic: 'x'.repeat(201),
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('validation_error')
    expect(body.error.details?.topic).toEqual(expect.any(String))

    const slotsResponse = await app.request('/api/event-types/1/slots?date=2026-11-23')
    const slots = (await slotsResponse.json()) as { slots: string[] }
    expect(slots.slots).toContain('2026-11-23T09:00:00+05:00')
  })

  it('отвергает старт вне сетки 30 минут', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await postBooking({
      ...validBooking,
      start: '2026-11-23T09:15:00+05:00',
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('validation_error')
    expect(body.error.details?.start).toEqual(expect.any(String))
  })

  it('отвергает старт в прошлом', async () => {
    freezeNow('2026-11-22T05:20:00Z') // 10:20 по зоне владельца

    const { status, body } = await postBooking({
      ...validBooking,
      start: '2026-11-22T10:00:00+05:00',
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('validation_error')
  })

  it('отвергает слот, который не помещается в рабочие часы', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const tooLate = await postBooking({
      eventTypeId: '2', // 60 минут
      start: '2026-11-23T17:30:00+05:00',
      guestName: 'Аня',
    })
    const tooEarly = await postBooking({
      ...validBooking,
      start: '2026-11-23T08:00:00+05:00',
    })

    expect(tooLate.status).toBe(400)
    expect(tooEarly.status).toBe(400)
  })

  it('отвергает старт вне окна записи', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const afterWindow = await postBooking({
      ...validBooking,
      start: '2026-12-06T09:00:00+05:00',
    })
    const beforeWindow = await postBooking({
      ...validBooking,
      start: '2026-11-21T09:00:00+05:00',
    })

    expect(afterWindow.status).toBe(400)
    expect(beforeWindow.status).toBe(400)
  })

  it('отвечает 404 для несуществующего типа встречи', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await postBooking({ ...validBooking, eventTypeId: '999' })

    expect(status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })

  it('запрещает пересечение, включая частичное наложение разных типов; примыкание разрешено', async () => {
    freezeNow('2026-11-22T05:20:00Z')
    bookingRepository.add({
      id: 'b1',
      eventTypeId: '2',
      start: new Date('2026-11-23T10:00:00+05:00'),
      durationMinutes: 60, // 10:00–11:00
      guestName: 'Игорь',
    })

    const overlap = await postBooking({
      eventTypeId: '1', // 30 минут, 10:30–11:00 пересекает 10:00–11:00
      start: '2026-11-23T10:30:00+05:00',
      guestName: 'Аня',
    })
    const adjacent = await postBooking({
      eventTypeId: '1', // 30 минут, 11:00–11:30 — примыкает к 10:00–11:00
      start: '2026-11-23T11:00:00+05:00',
      guestName: 'Аня',
    })

    expect(overlap.status).toBe(409)
    expect(overlap.body.error.code).toBe('slot_unavailable')
    expect(adjacent.status).toBe(201)
  })

  it('отвергает второй из двух одновременных запросов на один слот', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const results = await Promise.all([
      postBooking(validBooking),
      postBooking({ ...validBooking, guestName: 'Второй гость' }),
    ])

    expect(results.map((r) => r.status).sort()).toEqual([201, 409])
  })

  it('тела ответов соответствуют схеме из openapi.yaml', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const created = await postBooking(validBooking)
    const badRequest = await postBooking({ ...validBooking, guestName: '' })
    const notFound = await postBooking({ ...validBooking, eventTypeId: '999' })
    const conflict = await postBooking(validBooking)

    expect(responseValidator(201)?.(created.body) ?? true).toBe(true)
    expect(responseValidator(400)?.(badRequest.body) ?? true).toBe(true)
    expect(responseValidator(404)?.(notFound.body) ?? true).toBe(true)
    expect(responseValidator(409)?.(conflict.body) ?? true).toBe(true)
  })
})
