import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/admin/site-url";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrl();
  if (!siteUrl || !getSupabaseConfig()) {
    return new NextResponse("Recuperação indisponível: configure o Supabase e NEXT_PUBLIC_SITE_URL.", {
      status: 503, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let valid = false;
  if (type === "recovery" && tokenHash && tokenHash.length <= 512) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      valid = !error;
    } catch {
      valid = false;
    }
  }
  // Não aceitar next/redirectTo fornecidos pelo visitante.
  const response = NextResponse.redirect(new URL(valid ? "/admin/redefinir-senha" : "/admin/recuperar-senha?erro=link", siteUrl));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
