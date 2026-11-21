import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './app/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

describe('главная страница', () => {
  it('показывает название сервиса и ведёт на страницу записи', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Запись на звонок' })).toBeInTheDocument()
    expect(
      screen.getByText('Выберите тип встречи и свободное время — и вы записаны на звонок.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Записаться' })).toHaveAttribute('href', '/booking')
  })

  it('из шапки можно попасть на страницу владельца и вернуться на главную', () => {
    renderAt('/')

    const header = within(screen.getByRole('banner'))
    expect(header.getByRole('link', { name: 'Я владелец' })).toHaveAttribute('href', '/admin')
    expect(header.getByRole('link', { name: 'Запись на звонок' })).toHaveAttribute('href', '/')
  })

  it('страница записи открывается по /booking', () => {
    renderAt('/booking')

    expect(screen.getByRole('heading', { name: 'Страница записи' })).toBeInTheDocument()
  })

  it('страница владельца открывается по /admin', () => {
    renderAt('/admin')

    expect(screen.getByRole('heading', { name: 'Страница владельца' })).toBeInTheDocument()
  })
})
