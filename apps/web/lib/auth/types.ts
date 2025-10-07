import type { SessionSnapshot } from "@/lib/session/types"

export type AuthFormStatus = "idle" | "validation" | "error" | "success"

export type FieldErrors<TFields extends string> = Partial<Record<TFields, string>>

export interface FormState<TFields extends string> {
  status: AuthFormStatus
  message?: string
  fieldErrors?: FieldErrors<TFields>
  session?: SessionSnapshot
}

export function createInitialFormState<TFields extends string>(): FormState<TFields> {
  return {
    status: "idle"
  }
}
