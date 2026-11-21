import { Link, Outlet } from 'react-router'

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-4xl items-center justify-between p-4">
          <Link to="/" className="font-semibold">
            Запись на звонок
          </Link>
          <Link to="/admin" className="text-muted-foreground hover:text-foreground">
            Я владелец
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}
