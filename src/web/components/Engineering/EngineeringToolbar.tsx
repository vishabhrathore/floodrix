import React from 'react';
import { TreeNode } from '../../constants/engineeringCore';

interface EngineeringToolbarProps {
  currentModule: string;
  path: string[];
  mode: 'manual' | 'batch';
  setMode: (mode: 'manual' | 'batch') => void;
  setPath: (path: string[]) => void;
  setResult: (res: any) => void;
  tree: Record<string, TreeNode>;
  handleGoBack: (idx: number) => void;
}

const EngineeringToolbar: React.FC<EngineeringToolbarProps> = ({
  currentModule,
  path,
  mode,
  setMode,
  setPath,
  setResult,
  tree,
  handleGoBack
}) => {
  const isLeaf = path.length > 0;

  return (
    <div className="w-full max-w-[1440px] px-4 md:px-12 lg:px-20 mb-6 md:mb-10 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-[12px] font-medium text-slate-400">
          <span className="cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleGoBack(-1)}>
            Home
          </span>
          <span className="text-brand-red font-black">.</span>
          <span className="text-slate-900 font-bold">
            {currentModule === 'batch' ? 'Batch' : tree[currentModule]?.label}
          </span>
          {path.map((segment, idx) => (
            <React.Fragment key={idx}>
              <span className="text-brand-red font-black">.</span>
              <span 
                className={`cursor-pointer hover:text-slate-900 transition-colors ${idx === path.length - 1 ? 'text-slate-900 font-bold' : ''}`}
                onClick={() => handleGoBack(idx)}
              >
                {segment.replace(/_/g, ' ')}
              </span>
            </React.Fragment>
          ))}
        </div>
 
        {/* Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setMode('manual')}
            className={`px-4 md:px-6 py-1.5 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all ${mode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Manual
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`px-4 md:px-6 py-1.5 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all ${mode === 'batch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Batch
          </button>
        </div>
      </div>

      {/* Breadcrumb Pills (Solving Mode Only) */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => handleGoBack(-1)}
          className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10"
        >
          {tree[currentModule]?.label}
        </button>
        {path.map((p, idx) => (
          <React.Fragment key={idx}>
            <div className="flex items-center text-slate-300">
              <div className="w-4 h-[1px] bg-slate-200" />
            </div>
            <button
              onClick={() => handleGoBack(idx)}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                idx === path.length - 1 
                ? 'bg-white border-2 border-brand-red text-brand-red' 
                : 'bg-white border-2 border-slate-100 text-slate-400'
              }`}
            >
              {p.replace(/_/g, ' ')}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default EngineeringToolbar;
