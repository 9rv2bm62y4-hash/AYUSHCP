import React, { useEffect } from 'react';
import { X, Keyboard, Terminal, Code2, Layers, Cpu, CornerDownLeft } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  action: string;
  context: 'Global' | 'Terminal' | 'Python' | 'Generator';
}

const SHORTCUTS: ShortcutEntry[] = [
  // Global
  { keys: ['Ctrl', 'Enter'], action: 'Apply generated config / Run Python script / Send command', context: 'Global' },
  { keys: ['Alt', '1'], action: 'Switch to Hands-on Labs tab', context: 'Global' },
  { keys: ['Alt', '2'], action: 'Switch to Python 3.10 Studio tab', context: 'Global' },
  { keys: ['Alt', '3'], action: 'Switch to Config Generator tab', context: 'Global' },
  { keys: ['Alt', '4'], action: 'Switch to Custom Topology tab', context: 'Global' },
  { keys: ['Alt', '5'], action: 'Switch to Scenarios & Prep tab', context: 'Global' },
  { keys: ['Ctrl', ']'], action: 'Navigate to Next Lab in curriculum', context: 'Global' },
  { keys: ['Ctrl', '['], action: 'Navigate to Previous Lab in curriculum', context: 'Global' },
  { keys: ['?'], action: 'Open this Keyboard Shortcuts cheat sheet', context: 'Global' },
  { keys: ['Esc'], action: 'Close dialogs or clear current selection', context: 'Global' },

  // Terminal
  { keys: ['Enter'], action: 'Execute command in active device console', context: 'Terminal' },
  { keys: ['Tab'], action: 'Cisco IOS command auto-complete (e.g. "sh" -> "show")', context: 'Terminal' },
  { keys: ['?'], action: 'Cisco context-sensitive help for current EXEC / config mode', context: 'Terminal' },
  { keys: ['↑', '↓'], action: 'Cycle through command history buffer', context: 'Terminal' },
  { keys: ['Ctrl', 'B'], action: 'Toggle Quick Commands sidebar in terminal', context: 'Terminal' },
  { keys: ['Ctrl', 'L'], action: 'Clear terminal screen history', context: 'Terminal' },

  // Python Studio
  { keys: ['Ctrl', 'Enter'], action: 'Execute Python 3.10 script via Linux backend', context: 'Python' },
  { keys: ['Tab'], action: 'Indent code 4 spaces in Python editor', context: 'Python' },

  // Config Generator
  { keys: ['Ctrl', 'Enter'], action: 'Push generated CLI syntax directly to active lab device', context: 'Generator' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-300">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Keyboard Shortcuts & Power Hotkeys</span>
              </h3>
              <p className="text-[11px] text-slate-400">Fast navigation and command execution across Config</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Section: Global & Navigation */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 font-mono mb-2 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Global Application Navigation</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter((s) => s.context === 'Global').map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <span className="text-slate-300 text-[11.5px] truncate mr-2">{item.action}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-cyan-300 shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Cisco Terminal Hotkeys */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 font-mono mb-2 uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5" />
              <span>Cisco IOS Terminal Controls</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter((s) => s.context === 'Terminal').map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <span className="text-slate-300 text-[11.5px] truncate mr-2">{item.action}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-emerald-300 shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Python 3.10 & Generator */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 font-mono mb-2 uppercase tracking-wider">
              <Code2 className="w-3.5 h-3.5" />
              <span>Python 3.10 Automation & Config Generator</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter((s) => s.context === 'Python' || s.context === 'Generator').map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <span className="text-slate-300 text-[11.5px] truncate mr-2">{item.action}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-amber-300 shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Tip: Press <kbd className="px-1 bg-slate-800 border border-slate-700 text-slate-200 rounded text-[10px]">?</kbd> anywhere to open this modal</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
