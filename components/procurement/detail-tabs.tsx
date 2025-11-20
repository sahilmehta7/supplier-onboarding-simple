"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DetailTab {
  id: string;
  label: string;
  content: ReactNode;
  badge?: ReactNode;
}

interface DetailTabsProps {
  tabs: DetailTab[];
  defaultTabId: string;
}

export function DetailTabs({ tabs, defaultTabId }: DetailTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTabId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <span>{tab.label}</span>
            {tab.badge}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {tabs.map((tab) =>
          tab.id === activeTab ? (
            <div key={tab.id} className="space-y-4">
              {tab.content}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

