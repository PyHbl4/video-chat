import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const STEPS = [
  {
    title: "Добро пожаловать",
    description: "Коротко расскажем о возможностях ownSpace и подготовим окружение."
  },
  {
    title: "Подключение VDS",
    description: "Проверим доступность сервера и настроим передачу медиа."
  },
  {
    title: "Настройка профиля",
    description: "Добавьте фото, имя и статус, чтобы коллеги легко вас узнавали."
  }
]

export default function OnboardingPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Добро пожаловать в ownSpace</h1>
        <p className="text-sm text-muted-foreground">
          Пройдите три шага, чтобы подготовить рабочее пространство.
        </p>
      </header>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Пошаговая настройка</CardTitle>
          <CardDescription>Следуйте этапам последовательно, чтобы ничего не упустить.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {STEPS.map((step, index) => (
            <div key={step.title}>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {index < STEPS.length - 1 ? <Separator className="my-6" /> : null}
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button>Начать настройку</Button>
        </CardFooter>
      </Card>
    </section>
  )
}
