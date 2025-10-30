import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-16">
      <header className="space-y-1 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Вход в ownSpace</h1>
        <p className="text-sm text-muted-foreground">Введите email и пароль для авторизации.</p>
      </header>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Авторизация</CardTitle>
          <CardDescription>Используйте учётные данные, выданные администратором.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full">Войти</Button>
          <p className="text-center text-xs text-muted-foreground">
            Нет аккаунта? <Link href="/auth/register" className="underline">Зарегистрируйтесь</Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  )
}
