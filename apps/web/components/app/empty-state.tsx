import type { LucideIcon } from "lucide-react"

import { Button, type ButtonProps, Card, CardContent } from "@video-chat/ui"

export interface EmptyStateAction extends ButtonProps {
  label: string
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
        {(action || secondaryAction) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {action ? (
              <Button {...action}>{action.label}</Button>
            ) : null}
            {secondaryAction ? (
              <Button variant="outline" {...secondaryAction}>
                {secondaryAction.label}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
