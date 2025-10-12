import type { LucideIcon } from "lucide-react"

import { Button, Card, CardContent } from "@video-chat/ui"

type ButtonLikeProps = Record<string, unknown>

export interface EmptyStateAction extends Partial<ButtonLikeProps> {
  label: string
  disabled?: boolean
}

function normalizeAction(action?: EmptyStateAction) {
  if (!action) return null
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

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  const primary = normalizeAction(action ?? undefined)
  const secondary = normalizeAction(secondaryAction ?? undefined)

  return (
    <Card className="h-full min-h-[280px] border-dashed text-center shadow-none">
      <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <span className="rounded-full bg-muted/60 p-3 text-muted-foreground">
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {(primary || secondary) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {primary ? <Button {...primary.props}>{primary.label}</Button> : null}
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
