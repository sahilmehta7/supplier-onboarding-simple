"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Globe,
  ListChecks,
  FileText,
  FileStack,
  History,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Entities", href: "/dashboard/admin/entities", icon: Building2 },
  { label: "Geographies", href: "/dashboard/admin/geographies", icon: Globe },
  { label: "Form Definitions", href: "/dashboard/admin/forms", icon: ListChecks },
  { label: "Document Catalog", href: "/dashboard/admin/documents", icon: FileText },
  {
    label: "Requirements",
    href: "/dashboard/admin/requirements",
    icon: FileStack,
  },
  { label: "Audit History", href: "/dashboard/admin/audit", icon: History },
];

export function AdminConfigNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/60 p-1 text-sm shadow-sm">
      {navItems.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 transition ${
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}


