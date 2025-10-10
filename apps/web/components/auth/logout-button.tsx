"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { Button } from "@video-chat/ui"
import { useSession } from "@video-chat/web-auth"
import { logoutAction } from "@video-chat/web-auth/auth/actions"

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter()
  const { setSession } = useSession()
  const [pending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      const nextSession = await logoutAction()
      setSession(nextSession)
      router.replace("/auth/login")
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={pending}
      aria-disabled={pending}
      className={className}
    >
      {pending ? "Выходим..." : "Выйти"}
    </Button>
  )
}
