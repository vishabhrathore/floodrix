import React from "react";

import {
  Anchor,
  Calculator,
  CloudRain,
  Droplets,
  History,
  LayoutDashboard,
} from "lucide-react";
import { motion } from "motion/react";

import { TreeNode } from "../../constants/engineeringCore";

interface EngineeringSidebarProps {
  tree: Record<string, TreeNode>;
  currentModule: string;
  handleNav: (id: string) => void;
  mode: "manual" | "batch";
}

const EngineeringSidebar: React.FC<EngineeringSidebarProps> = ({
  tree,
  currentModule,
  handleNav,
  mode,
}) => {
  return (
    <aside className="w-72 h-screen sticky top-0 bg-white border-r border-slate-200 hidden lg:flex flex-col">
      <div className="flex-1 overflow-y-auto pt-32 px-4">
        {/* Calculators Category */}
        <div className="mb-8">
          <div className="px-4 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Calculators
          </div>
          <div className="space-y-1">
            {Object.entries(tree).map(([id, item]) => (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group relative ${
                  currentModule === id && mode === "manual"
                    ? "bg-brand-red text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`${
                    currentModule === id && mode === "manual"
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  {React.isValidElement(item.icon)
                    ? React.cloneElement(item.icon as React.ReactElement<any>, {
                        size: 18,
                      })
                    : null}
                </div>
                <span className="text-[13px] font-bold font-sans">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tools Category */}
        <div className="mb-8">
          <div className="px-4 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Tools
          </div>
          <div className="space-y-2 px-4">
            <button
              onClick={() => {
                setMode("batch");
                handleNav("batch"); // Handle as a special nav case
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${
                mode === "batch"
                  ? "bg-slate-900 text-white shadow-xl"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  mode === "batch"
                    ? "bg-white/10 text-brand-red"
                    : "bg-slate-900 text-white group-hover:bg-brand-red"
                }`}
              >
                <div className="w-4 h-4 border-2 border-current rounded-sm" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] font-sans">
                Pipeline Control
              </span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 group">
              <History className="w-[18px] h-[18px] text-slate-400 group-hover:text-slate-600" />
              <span className="text-[13px] font-bold font-sans">History</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EngineeringSidebar;
