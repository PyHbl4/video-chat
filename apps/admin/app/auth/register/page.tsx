import type { Metadata } from "next"

import { RegisterForm } from "./register-form"

export const metadata: Metadata = {
  title: "Запрос доступа — Админка"
}

export default function AdminRegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <RegisterForm />
    </div>
  )
}
