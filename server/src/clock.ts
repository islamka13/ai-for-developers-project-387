/**
 * Источник текущего времени. В тестах подменяется `clock.now`,
 * чтобы проверки границ окна записи были детерминированными.
 */
export interface Clock {
  now(): Date
}

export const clock: Clock = {
  now: () => new Date(),
}
