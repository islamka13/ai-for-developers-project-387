import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: { target: '../contract/openapi.yaml' },
    output: {
      mode: 'single',
      client: 'hono',
      target: 'src/generated/index.ts',
      schemas: 'src/generated/schemas',
      override: {
        hono: {
          handlers: 'src/handlers',
          compositeRoute: 'src/generated/routes.ts',
          validatorOutputPath: 'src/generated/validator.ts',
        },
        zod: {
          // start хранится с offset зоны владельца (+05:00), а не только в Z.
          dateTimeOptions: { offset: true },
        },
      },
    },
  },
})
