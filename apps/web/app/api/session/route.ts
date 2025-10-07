import { NextResponse } from "next/server"

import { getInitialSession } from "@/lib/session/server"

export async function GET() {
  const session = await getInitialSession()
  return NextResponse.json(session, {
    headers: {
      "cache-control": "no-store"
    }
  })
}
