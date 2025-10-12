"use client"

import Link from "next/link"

import { cn } from "@video-chat/ui"

import { MainLogo } from "@/components/logos/main-logo"

export interface BrandHeaderProps {
  href?: string
  className?: string
  showTagline?: boolean
  compact?: boolean
  logoSize?: number
}

export function BrandHeader({
  href = "/app",
  className,
  showTagline = true,
  compact = false,
  logoSize = compact ? 28 : 36
}: BrandHeaderProps) {
  const Wrapper = href ? Link : "div"

  const wrapperProps = href
    ? { href }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "inline-flex items-center gap-3 text-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        compact && "gap-2",
        className
      )}
    >
      <MainLogo
        size={logoSize}
        color="var(--foreground)"
        accent="var(--primary)"
        aria-hidden
      />
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold leading-tight tracking-tight">ownSpace</span>
        {showTagline ? (
          <span className="text-xs font-medium text-muted-foreground">
            Self-Hosted Video Chat
          </span>
        ) : null}
      </div>
      <span className="sr-only">ownSpace — Self-Hosted Video Chat</span>
    </Wrapper>
  )
}
