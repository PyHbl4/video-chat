"use client"

import {
  AvatarFallback,
  Avatar,
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger
} from "@video-chat/ui"

import type { SessionSnapshot } from "@video-chat/web-auth"

import { LogoutButton } from "@/components/auth/logout-button"

export interface AppShellProps {
  user: SessionSnapshot["user"]
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ user, sidebar, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/10">
        <Sidebar className="border-r">
          <SidebarHeader className="gap-4 p-4">
            <SidebarTrigger className="self-end" />
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Профиль</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                  <Avatar className="size-10">
                    <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium leading-none">{user?.username ?? "Аноним"}</span>
                    {user?.email && (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    )}
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarHeader>
          {sidebar}
          <SidebarFooter className="mt-auto border-t p-4">
            <LogoutButton className="w-full" />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <div className="flex h-full flex-col gap-6 px-6 py-8">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
