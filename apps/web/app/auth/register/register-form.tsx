"use client"

import Link from "next/link"
import { useFormState, useFormStatus } from "react-dom"

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
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
  Input,
  Spinner
} from "@video-chat/ui"

import { initialRegisterState, registerAction } from "@/lib/auth/actions"
import type { RegisterFields } from "@/lib/auth/actions"

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-disabled={pending}>
      {pending && <Spinner className="mr-2" />} {pending ? "Создаём..." : children}
    </Button>
  )
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initialRegisterState)
  const fieldErrors = state.fieldErrors ?? ({} as Record<RegisterFields, string | undefined>)

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт, чтобы приглашать друзей и проводить звонки.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "error" && state.message && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Не удалось зарегистрироваться</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        {state.status === "success" && state.message && (
          <Alert className="mb-4">
            <AlertTitle>Готово</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <form action={formAction} className="space-y-6" noValidate>
          <FieldSet className="gap-6">
            <Field data-invalid={Boolean(fieldErrors.email)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  placeholder="you@example.com"
                />
                <FieldError>{fieldErrors.email}</FieldError>
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.username)}>
              <FieldLabel htmlFor="username">Имя пользователя</FieldLabel>
              <FieldContent>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={32}
                  aria-invalid={Boolean(fieldErrors.username)}
                  placeholder="maxim"
                />
                <FieldDescription>От 3 до 32 символов. Латиница, цифры и подчёркивания.</FieldDescription>
                <FieldError>{fieldErrors.username}</FieldError>
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(fieldErrors.password)}>
              <FieldLabel htmlFor="password">Пароль</FieldLabel>
              <FieldContent>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <FieldDescription>Минимум 8 символов. Используйте буквы, цифры и спецсимволы.</FieldDescription>
                <FieldError>{fieldErrors.password}</FieldError>
              </FieldContent>
            </Field>
          </FieldSet>
          <SubmitButton>Создать аккаунт</SubmitButton>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Уже есть аккаунт? <Link href="/auth/login" className="text-primary hover:underline">Войти</Link>
      </CardFooter>
    </Card>
  )
}
