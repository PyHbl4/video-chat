import { cn } from "@video-chat/ui"

export interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
  children
}: AdminPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground md:text-base">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex flex-col items-start gap-2 md:flex-row md:items-center">{actions}</div> : null}
    </div>
  )
}
