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

const systemNow = clock.now

afterEach(() => {
  clock.now = systemNow
  bookingRepository.clear()
})

async function getBookings() {
  const response = await app.request('/api/bookings')
  return {
    status: response.status,
    body: (await response.json()) as {
      bookings: Array<{
        id: string
        eventTypeId: string
        start: string
        guestName: string
        eventType: { id: string; title: string; durationMinutes: number }
      }>
    },
  }
}

describe('GET /api/bookings', () => {
  it('возвращает только незавершённые встречи по возрастанию времени с вложенным типом', async () => {
    clock.now = () => new Date('2026-11-22T05:20:00Z') // 10:20 по зоне владельца
    bookingRepository.add({
      id: 'finished',
      eventTypeId: '1',
      start: new Date('2026-11-22T09:00:00+05:00'), // закончилась в 09:30
      durationMinutes: 30,
      guestName: 'Прошлая',
    })
    bookingRepository.add({
      id: 'later',
      eventTypeId: '2',
      start: new Date('2026-11-24T11:00:00+05:00'),
      durationMinutes: 60,
      guestName: 'Позже',
    })
    bookingRepository.add({
      id: 'sooner',
      eventTypeId: '1',
      start: new Date('2026-11-23T09:00:00+05:00'),
      durationMinutes: 30,
      guestName: 'Раньше',
    })

    const { status, body } = await getBookings()

    expect(status).toBe(200)
    expect(body.bookings.map((booking) => booking.id)).toEqual(['sooner', 'later'])
    expect(body.bookings[0]).toMatchObject({
      start: '2026-11-23T09:00:00+05:00',
      guestName: 'Раньше',
      eventType: { id: '1', title: 'Знакомство', durationMinutes: 30 },
    })
    expect(body.bookings[1].eventType).toMatchObject({
      id: '2',
      title: 'Консультация',
      durationMinutes: 60,
    })
  })

  it('пустое состояние: список встреч пуст', async () => {
    clock.now = () => new Date('2026-11-22T05:20:00Z')

    const { body } = await getBookings()

    expect(body.bookings).toEqual([])
  })

  it('ответ соответствует схеме из openapi.yaml', async () => {
    clock.now = () => new Date('2026-11-22T05:20:00Z')
    bookingRepository.add({
      id: 'b1',
      eventTypeId: '1',
      start: new Date('2026-11-23T09:00:00+05:00'),
      durationMinutes: 30,
      guestName: 'Аня',
    })

    const { body } = await getBookings()
    const validate = ajv.compile(
      spec.paths['/api/bookings'].get.responses['200'].content['application/json'].schema,
    )

    expect(validate(body)).toBe(true)
  })
})
