import path from 'node:path'
import SwaggerParser from '@apidevtools/swagger-parser'
import AjvModule from 'ajv'
import addFormatsModule from 'ajv-formats'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.ts'
import { bookingRepository } from '../src/bookings.ts'
import { clock } from '../src/clock.ts'

// CJS-пакеты под verbatimModuleSyntax: default-экспорт лежит в `.default`.
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

/** Валидатор тела ответа; падает, если путь или код не описаны в контракте. */
function responseValidator(routePath: string, method: string, status: number) {
  const operation = spec.paths[routePath]?.[method]
  if (!operation) throw new Error(`${method.toUpperCase()} ${routePath} не описан в контракте`)
  const response =
    operation.responses?.[status] ??
    operation.responses?.[`${String(status)[0]}XX`] ??
    operation.responses?.default
  if (!response) throw new Error(`Код ${status} не описан для ${method.toUpperCase()} ${routePath}`)
  const schema = response.content?.['application/json']?.schema
  return schema ? ajv.compile(schema) : null
}

const systemNow = clock.now

// Фиксированное «сейчас»: 10:20 по зоне владельца (UTC+5) 2026-11-22.
// Окно записи: 2026-11-22 … 2026-12-05.
function freezeNow(iso: string) {
  clock.now = () => new Date(iso)
}

afterEach(() => {
  clock.now = systemNow
})

async function getSlots(id: number | string, date: string) {
  const response = await app.request(`/api/event-types/${id}/slots?date=${date}`)
  return { status: response.status, body: (await response.json()) as { slots?: string[] } }
}

describe('GET /api/event-types/{id}/slots', () => {
  it('отдаёт старты по сетке 30 минут для типа на 30 минут', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await getSlots(1, '2026-11-23')

    expect(status).toBe(200)
    expect(body.slots?.[0]).toBe('2026-11-23T09:00:00+05:00')
    expect(body.slots?.[1]).toBe('2026-11-23T09:30:00+05:00')
    expect(body.slots).toHaveLength(18)
    for (const slot of body.slots ?? []) {
      const minutes = new Date(slot).getUTCMinutes()
      expect([0, 30]).toContain(minutes)
    }
  })

  it('последний слот целиком помещается в рабочие часы: тип на 60 минут стартует не позже 17:00', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const { status, body } = await getSlots(2, '2026-11-23')

    expect(status).toBe(200)
    expect(body.slots?.at(-1)).toBe('2026-11-23T17:00:00+05:00')
  })

  it('возвращает слоты на первую и последнюю даты окна записи, а за его пределами — пусто', async () => {
    freezeNow('2026-11-22T02:00:00Z') // 07:00 по зоне владельца, день ещё не начался

    const first = await getSlots(1, '2026-11-22')
    const last = await getSlots(1, '2026-12-05')
    const afterWindow = await getSlots(1, '2026-12-06')
    const beforeWindow = await getSlots(1, '2026-11-21')

    expect(first.body.slots?.length).toBeGreaterThan(0)
    expect(last.body.slots?.length).toBeGreaterThan(0)
    expect(last.body.slots?.[0]).toBe('2026-12-05T09:00:00+05:00')
    expect(afterWindow.body.slots).toEqual([])
    expect(beforeWindow.body.slots).toEqual([])
  })

  it('скрывает сегодняшние слоты, которые уже начались', async () => {
    freezeNow('2026-11-22T05:20:00Z') // 10:20 по зоне владельца

    const { status, body } = await getSlots(1, '2026-11-22')

    expect(status).toBe(200)
    expect(body.slots?.[0]).toBe('2026-11-22T10:30:00+05:00')
    expect(body.slots).not.toContain('2026-11-22T10:00:00+05:00')
  })

  it('не возвращает занятый слот, но разрешает примыкание', async () => {
    freezeNow('2026-11-22T05:20:00Z')
    bookingRepository.add({
      id: 'b1',
      eventTypeId: '1',
      start: new Date('2026-11-24T10:00:00+05:00'),
      durationMinutes: 30,
      guestName: 'Тест',
    })

    const { status, body } = await getSlots(1, '2026-11-24')

    expect(status).toBe(200)
    expect(body.slots).not.toContain('2026-11-24T10:00:00+05:00')
    expect(body.slots).toContain('2026-11-24T09:30:00+05:00')
    expect(body.slots).toContain('2026-11-24T10:30:00+05:00')
  })

  it('отвечает 404 not_found для несуществующего типа встречи', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const response = await app.request('/api/event-types/999/slots?date=2026-11-23')

    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('not_found')
  })

  it('ответы соответствуют схеме из openapi.yaml', async () => {
    freezeNow('2026-11-22T05:20:00Z')

    const okResponse = await app.request('/api/event-types/1/slots?date=2026-11-23')
    const validateOk = responseValidator('/api/event-types/{id}/slots', 'get', 200)
    expect(validateOk?.((await okResponse.json()) as unknown) ?? true).toBe(true)

    const notFoundResponse = await app.request('/api/event-types/999/slots?date=2026-11-23')
    const validate404 = responseValidator('/api/event-types/{id}/slots', 'get', 404)
    expect(validate404?.((await notFoundResponse.json()) as unknown) ?? true).toBe(true)
  })
})
