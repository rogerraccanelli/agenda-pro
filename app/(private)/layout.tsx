"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { cn } from "../../lib/utils";

const icons = {
  dashboard: "📊",
  agenda: "📅",
  finances: "💰",
  services: "✂️",
  clientes: "👥",
  config: "⚙️",
};

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // 🔒 Proteção de rota
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  const menu = [
    { label: "Dashboard", href: "/dashboard", icon: icons.dashboard },
    { label: "Agenda", href: "/agenda", icon: icons.agenda },
    { label: "Financeiro", href: "/finances", icon: icons.finances },
    { label: "Serviços", href: "/services", icon: icons.services },
    { label: "Clientes", href: "/clientes", icon: icons.clientes },
    { label: "Configurações", href: "/config", icon: icons.config },
  ];

  return (
    /**
     * ⬇️ CONTAINER RAIZ
     * - min-h-dvh: altura real no iOS (corrige Safari)
     * - overflow-x-hidden: mata estouro lateral
     */
    <div className="min-h-dvh w-full overflow-x-hidden bg-[#F8F7FC] text-[#1F1B2E]">
      <div className="flex w-full min-h-dvh">
        {/* ---------------- SIDEBAR (DESKTOP) ---------------- */}
        <aside className="hidden md:flex flex-col w-60 bg-white border-r border-[#eceaf5] p-5">
          <div className="font-extrabold text-xl mb-8 text-[#6D28D9]">
            AGENDA PRO
          </div>

          <nav className="flex flex-col gap-2">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition",
                  pathname === item.href
                    ? "bg-[#6D28D9] text-white"
                    : "hover:bg-[#f3f0ff] hover:text-[#5B21B6]"
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-auto text-sm bg-[#eee9f7] hover:bg-[#e3d8f8] transition px-4 py-2 rounded-md font-medium"
          >
            Sair
          </button>
        </aside>

        {/* ---------------- MAIN ---------------- */}
        <main
          /**
           * pb-24:
           * reserva espaço para o bottom nav
           * evita que conteúdo fique por trás
           */
          className="flex-1 w-full px-4 md:px-6 py-6 pb-24 overflow-y-auto"
        >
          {children}
        </main>
      </div>

      {/* ---------------- BOTTOM NAV (MOBILE) ---------------- */}
      <nav
        className="
          md:hidden
          fixed
          bottom-0
          left-0
          right-0
          z-50
          bg-white
          border-t
          border-[#eceaf5]
          pt-2
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <div className="flex justify-around">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center text-xs font-medium py-2",
                pathname === item.href
                  ? "text-[#6D28D9]"
                  : "text-[#6b6b7a]"
              )}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
