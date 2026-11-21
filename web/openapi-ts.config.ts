import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: '../contract/openapi.yaml',
  output: 'src/client',
})
