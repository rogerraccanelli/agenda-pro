"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, DollarSign, Users, Settings } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/agenda", label: "Agenda", icon: Calendar },
    { href: "/finances", label: "Financeiro", icon: DollarSign },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/config", label: "Config", icon: Settings },
  ];

  return (
    <nav
      className="
        fixed
        bottom-0
        left-0
        w-screen
        z-[9999]
        bg-white
        border-t
        border-slate-200
        md:hidden
        pb-[env(safe-area-inset-bottom)]
      "
    >
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center text-xs"
            >
              <Icon
                size={22}
                className={active ? "text-purple-600" : "text-slate-400"}
              />
              <span
                className={
                  active
                    ? "text-purple-600 font-medium"
                    : "text-slate-400"
                }
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
