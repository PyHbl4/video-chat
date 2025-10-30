import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function VerifyPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-16">
      <header className="space-y-1 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Подтверждение email</h1>
        <p className="text-sm text-muted-foreground">
          Введите код, который мы отправили на указанную почту.
        </p>
      </header>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Проверка безопасности</CardTitle>
          <CardDescription>Мы используем одноразовые коды для защиты вашего аккаунта.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Код подтверждения</Label>
            <Input id="code" inputMode="numeric" placeholder="123456" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full">Подтвердить</Button>
          <p className="text-center text-xs text-muted-foreground">
            Не пришло письмо? <Link href="/auth/login" className="underline">Вернуться ко входу</Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  )
}
