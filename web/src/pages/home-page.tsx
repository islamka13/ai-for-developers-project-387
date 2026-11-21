import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Запись на звонок</h1>
      <p className="max-w-xl text-muted-foreground">
        Выберите тип встречи и свободное время — и вы записаны на звонок.
      </p>
      <Button asChild size="lg">
        <Link to="/booking">Записаться</Link>
      </Button>
    </main>
  )
}
