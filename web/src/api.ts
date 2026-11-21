import { client } from '@/client/client.gen'

// Запросы идут на тот же origin: в dev их проксирует Vite на :3000,
// в продакшене фронтенд раздаёт сам сервер.
client.setConfig({ baseUrl: window.location.origin })
