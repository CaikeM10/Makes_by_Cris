import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// O catálogo público não passa pela renovação de sessão do Admin.
export const config = { matcher: ["/admin/:path*", "/auth/confirm"] };
