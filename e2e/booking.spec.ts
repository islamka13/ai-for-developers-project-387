import { expect, test } from '@playwright/test'

test('гость записывается на слот, владелец видит встречу, повторная запись отклоняется', async ({
  page,
}) => {
  // Гость приходит с главной страницы.
  await page.goto('/')
  await page.getByRole('link', { name: 'Записаться' }).click()
  await expect(page).toHaveURL(/\/booking$/)

  // Выбираем тип встречи и завтрашнюю дату окна записи (сегодня слоты могут закончиться).
  await page.getByRole('button', { name: /Знакомство/ }).click()
  await page.getByRole('group', { name: 'Даты окна записи' }).getByRole('button').nth(1).click()

  const slot = page.locator('ul[aria-label="Свободные слоты"] button').first()
  await expect(slot).toBeVisible()
  const slotLabel = (await slot.textContent())?.trim() ?? ''
  expect(slotLabel).toMatch(/^\d{2}:\d{2}$/)
  await slot.click()

  await page.getByLabel('Имя гостя').fill('Е2E Гость')
  await page.getByRole('button', { name: 'Записаться' }).click()
  await expect(page.getByRole('region', { name: 'Подтверждение записи' })).toContainText(
    'Е2E Гость',
  )

  // Повторная попытка занять тот же слот (ещё видимый в календаре) отклоняется сервером.
  await page.getByRole('button', { name: 'Записаться на другое время' }).click()
  await page.getByRole('button', { name: slotLabel, exact: true }).click()
  await page.getByLabel('Имя гостя').fill('Второй гость')
  await page.getByRole('button', { name: 'Записаться' }).click()
  await expect(page.getByRole('alert', { name: 'Ошибка записи' })).toContainText(
    'Это время уже занято — выберите другой слот.',
  )

  // Владелец видит первую встречу в своём списке.
  await page.goto('/admin')
  const upcoming = page.getByRole('region', { name: 'Предстоящие встречи' })
  await expect(upcoming).toContainText('Е2E Гость')
  await expect(upcoming).toContainText('Знакомство')
})
