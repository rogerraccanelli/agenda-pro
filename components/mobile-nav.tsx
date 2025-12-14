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
    right-0
    z-50
    bg-white
    border-t
    md:hidden
    pb-[env(safe-area-inset-bottom)]
  "
    >


      <div className="flex justify-around h-16 items-center">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs ${
                active ? "text-purple-600 font-semibold" : "text-gray-500"
              }`}
            >
              <Icon
                size={22}
                className={active ? "text-purple-600" : "text-gray-500"}
              />
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
