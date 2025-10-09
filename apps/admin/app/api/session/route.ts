import { NextResponse } from "next/server"

import { getInitialSession } from "@video-chat/web-auth"

export async function GET() {
  const session = await getInitialSession()
  return NextResponse.json(session, {
    headers: {
      "cache-control": "no-store"
    }
  })
}
