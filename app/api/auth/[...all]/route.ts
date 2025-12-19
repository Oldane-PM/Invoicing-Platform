// Better Auth removed for testing
// import { auth } from "@/lib/auth";
// import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth API route handler - DISABLED FOR TESTING
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Auth disabled for testing' }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({ error: 'Auth disabled for testing' }, { status: 503 });
}

