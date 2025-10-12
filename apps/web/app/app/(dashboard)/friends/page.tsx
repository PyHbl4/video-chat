import { Suspense } from "react"

import { Skeleton } from "@video-chat/ui"

import { FriendsAppPage } from "@/components/app/friends-app-page"

export default function FriendsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <FriendsAppPage />
    </Suspense>
  )
}
