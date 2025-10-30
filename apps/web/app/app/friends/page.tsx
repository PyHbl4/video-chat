import { getFriends } from "@/lib/api/friends"

import { FriendsView } from "./friends-view"

export default async function FriendsPage() {
  const friends = await getFriends()

  return <FriendsView friends={friends} />
}
