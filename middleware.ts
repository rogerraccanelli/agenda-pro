import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("firebase-auth")?.value

  const isAuthPage = request.nextUrl.pathname.startsWith("/login")
  const isPrivate = request.nextUrl.pathname.startsWith("/agenda")

  // Se não está logado e tenta acessar área privada → manda para login
  if (!token && isPrivate) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Se está logado e tenta ir para /login → manda para /agenda
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/agenda", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/agenda/:path*", "/login"],
}
