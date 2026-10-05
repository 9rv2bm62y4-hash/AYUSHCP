import React from 'react';
import { Terminal, Code2, Network, Cpu, BookOpen, RotateCcw, CheckCircle2, Keyboard } from 'lucide-react';

export type ActiveTab = 'labs' | 'python' | 'generator' | 'sandbox' | 'interview';

interface TopBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedTrack: string;
  setSelectedTrack: (track: string) => void;
  completedLabsCount: number;
  totalLabsCount: number;
  onResetAll: () => void;
  onOpenShortcuts?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  selectedTrack,
  setSelectedTrack,
  completedLabsCount,
  totalLabsCount,
  onResetAll,
  onOpenShortcuts,
}) => {
  const tracks = ['All Tracks', 'CCNA', 'CCNP ENCOR', 'Security', 'Python Automation'];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Zone 1: Brand title & Emblem */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <Network className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">
                CONFIG <span className="text-cyan-400 font-normal">by Ayush Raj</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-mono">
                Python 3.10
              </span>
            </div>
            <p className="text-[11px] text-slate-400">GNS3 & Packet Tracer Replica · CCNA / CCNP / Data Centre · IPv6 Engine</p>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'labs'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Hands-on Labs</span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'sandbox'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>GNS3 / Packet Tracer Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'python'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Python 3.10 Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'generator'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Config Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('interview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'interview'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Scenarios & Prep</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Progress */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts (?)"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-cyan-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-800/80 rounded-md transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Shortcuts</span>
              <kbd className="hidden md:inline px-1 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                ?
              </kbd>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md font-mono tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{completedLabsCount}/{totalLabsCount} Labs</span>
          </div>

          <button
            onClick={onResetAll}
            title="Reset current lab state"
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/60 rounded-md transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Sub-bar for track filtering when Labs tab is active */}
      {activeTab === 'labs' && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 overflow-x-auto scrollbar-none text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Track:</span>
          {tracks.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTrack(t)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                selectedTrack === t
                  ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
