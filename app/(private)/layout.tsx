"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { cn } from "../../lib/utils";
import MobileNav from "@/components/mobile-nav";

const icons = {
  dashboard: "📊",
  agenda: "📅",
  finances: "💰",
  services: "✂️",
  clientes: "👥",
  config: "⚙️",
};

export default function PrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

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
    <div className="min-h-screen bg-[#F8F7FC] text-[#1F1B2E]">
      <div className="flex min-h-screen w-full">
        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col w-60 bg-white border-r p-5">
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
                    : "hover:bg-[#f3f0ff]"
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-auto text-sm bg-[#eee9f7] px-4 py-2 rounded-md"
          >
            Sair
          </button>
        </aside>

        {/* CONTENT */}
        <main className="flex-1 px-0 md:px-6 pt-4 pb-24 md:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* MOBILE NAV — SEM WRAPPER */}
      <MobileNav />
    </div>
  );
}
