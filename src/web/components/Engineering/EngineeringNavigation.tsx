import React from 'react';
import { motion } from 'motion/react';
import { TreeNode } from '../../constants/engineeringCore';

interface EngineeringNavigationProps {
  tree: Record<string, TreeNode>;
  currentModule: string;
  handleNav: (id: string) => void;
  mode: 'manual' | 'batch';
}

const EngineeringNavigation: React.FC<EngineeringNavigationProps> = ({
  tree,
  currentModule,
  handleNav,
  mode
}) => {
  return (
    <nav className="mt-4 px-4 md:px-12 lg:px-20 max-w-[1440px] mx-auto overflow-x-auto no-scrollbar">
      <div className="flex gap-6 md:gap-12 border-b border-slate-200 min-w-max">
        {Object.entries(tree).map(([id, item]) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            className={`flex items-center gap-4 transition-all relative pb-8 group ${currentModule === id && mode === 'manual' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${currentModule === id && mode === 'manual' ? 'bg-brand-red/5 text-brand-red' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'}`}>
              {typeof item.icon === 'string' ? (
                <span className="text-lg">{item.icon}</span>
              ) : (
                React.isValidElement(item.icon) ? React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 }) : null
              )}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] font-mono pt-0.5">
              {item.label}
            </span>
            {currentModule === id && mode === 'manual' && (
              <motion.div
                layoutId="active-tab"
                className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-red"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default EngineeringNavigation;
