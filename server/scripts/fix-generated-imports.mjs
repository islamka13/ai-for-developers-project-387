import { readFileSync, writeFileSync } from 'node:fs'

// Orval генерирует в index.context.ts импорт './schemas' без расширения,
// что не резолвится при moduleResolution nodenext. Дописываем явный путь.
const file = new URL('../src/generated/index.context.ts', import.meta.url)
const content = readFileSync(file, 'utf8')
writeFileSync(file, content.replace("from './schemas'", "from './schemas/index.ts'"))
