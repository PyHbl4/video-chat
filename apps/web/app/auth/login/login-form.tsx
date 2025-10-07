"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldSet,
  Input,
  Spinner
} from "@video-chat/ui"

import { useSession } from "@/hooks/use-session"
import { initialLoginState, loginAction } from "@/lib/auth/actions"
import type { LoginFields } from "@/lib/auth/actions"

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending && <Spinner className="mr-2" />} {pending ? "Входим..." : children}
    </Button>
  )
}

export function LoginForm() {
  const router = useRouter()
  const { setSession } = useSession()
  const [state, formAction] = useActionState(loginAction, initialLoginState)

  useEffect(() => {
    if (state.status === "success" && state.session) {
      setSession(state.session)
      router.replace("/app")
    }
  }, [router, setSession, state])

  const fieldErrors = state.fieldErrors ?? ({} as Record<LoginFields, string | undefined>)

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>Введите логин или email и пароль, чтобы продолжить.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "error" && state.message && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Не удалось войти</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <form action={formAction} className="space-y-6" noValidate>
          <FieldSet className="gap-6">
            <Field data-invalid={Boolean(fieldErrors.identifier)}>
              <FieldLabel htmlFor="identifier">Логин или email</FieldLabel>
              <FieldContent>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  placeholder="maxim или maxim@example.com"
                  aria-invalid={Boolean(fieldErrors.identifier)}
                />
                <FieldError>{fieldErrors.identifier}</FieldError>
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.password)}>
              <FieldLabel htmlFor="password">Пароль</FieldLabel>
              <FieldContent>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <FieldError>{fieldErrors.password}</FieldError>
              </FieldContent>
            </Field>
          </FieldSet>
          <SubmitButton>Войти</SubmitButton>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          Нет аккаунта? <Link href="/auth/register" className="text-primary hover:underline">Зарегистрироваться</Link>
        </span>
      </CardFooter>
    </Card>
  )
}
