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

  // 🔒 Proteção de rota — APENAS auth, sem redirect por pathname
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
      }
    });

    return () => unsub();
  }, [router]);

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }
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
    <div className="flex h-screen w-full bg-[#F8F7FC] text-[#1F1B2E]">
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
      <main className="flex-1 overflow-y-auto px-0 md:px-6 pb-20 md:pb-0">
        {children}
      </main>

      {/* ---------------- BOTTOM NAV (MOBILE) ---------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#eceaf5] flex items-center justify-around z-50">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center text-xs font-medium",
              pathname === item.href
                ? "text-[#6D28D9]"
                : "text-[#6b6b7a]"
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
