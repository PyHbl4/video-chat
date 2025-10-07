import type { Metadata } from "next"

import { RegisterForm } from "./register-form"

export const metadata: Metadata = {
  title: "Регистрация — Self-Hosted Video Chat"
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <RegisterForm />
    </div>
  )
}
