import { serve } from '@hono/node-server'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../src/app.ts'

type Server = ReturnType<typeof serve>

describe('дымовой тест', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = serve({ fetch: app.fetch, port: 0 }, (info) => {
        baseUrl = `http://localhost:${info.port}`
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err?: Error) => (err ? reject(err) : resolve()))
    })
  })

  it('приложение поднимается и отвечает на health-check', async () => {
    const response = await fetch(`${baseUrl}/api/health`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })
})
