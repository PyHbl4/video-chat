import type { LucideIcon } from "lucide-react"

import { Button, Card, CardContent } from "@video-chat/ui"

type ButtonLikeProps = Record<string, unknown>

export interface EmptyStateAction extends Partial<ButtonLikeProps> {
  label: string
  disabled?: boolean
}

function splitAction(
  action: EmptyStateAction | null
): { label: string; props: ButtonLikeProps } | null {
  if (!action) {
    return null
  }

  const { label, ...rest } = action
  return { label, props: rest }
}

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction
}: EmptyStateProps) {
  const primaryAction = splitAction(action ?? null)
  const secondary = splitAction(secondaryAction ?? null)

  return (
    <Card className="h-full min-h-[320px] border-dashed text-center shadow-none">
      <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-10">
        <span className="rounded-full bg-muted/60 p-3 text-muted-foreground">
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {(primaryAction || secondary) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {primaryAction ? (
              <Button {...primaryAction.props}>{primaryAction.label}</Button>
            ) : null}
            {secondary ? (
              <Button variant="outline" {...secondary.props}>
                {secondary.label}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
