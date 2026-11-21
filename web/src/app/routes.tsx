import type { RouteObject } from 'react-router'
import { AdminPage } from '../pages/admin-page'
import { BookingPage } from '../pages/booking-page'
import { HomePage } from '../pages/home-page'
import { Layout } from './layout'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/booking', element: <BookingPage /> },
      { path: '/admin', element: <AdminPage /> },
    ],
  },
]
