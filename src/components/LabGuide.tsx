import React, { useState } from 'react';
import { NetworkLab, SimulatedDevice, TopologyLink } from '../types/network';
import { CheckCircle2, Circle, HelpCircle, ChevronDown, ChevronRight, Copy, Award, ArrowRight, RotateCcw } from 'lucide-react';

interface LabGuideProps {
  lab: NetworkLab;
  devices: SimulatedDevice[];
  links: TopologyLink[];
  onResetLab: () => void;
  onNextLab?: () => void;
  hasNextLab?: boolean;
}

export const LabGuide: React.FC<LabGuideProps> = ({
  lab,
  devices,
  links,
  onResetLab,
  onNextLab,
  hasNextLab,
}) => {
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Convert device array to map for fast objective evaluation
  const devMap: Record<string, SimulatedDevice> = {};
  devices.forEach((d) => { devMap[d.id] = d; });

  const completedCount = lab.objectives.filter((obj) => obj.isCompleted(devMap, links)).length;
  const isAllComplete = completedCount === lab.objectives.length && lab.objectives.length > 0;
  const progressPercent = Math.round((completedCount / (lab.objectives.length || 1)) * 100);

  const toggleHint = (id: string) => {
    setExpandedHints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSolution = (id: string) => {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
            {lab.track} · {lab.category}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            {lab.difficulty} · {lab.duration}
          </span>
        </div>

        <h2 className="text-base font-bold text-slate-100">{lab.title}</h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{lab.scenario}</p>

        {/* Progress Bar */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-xs mb-1 font-mono">
            <span className="text-slate-400">Objectives Completed:</span>
            <span className={isAllComplete ? 'text-emerald-400 font-bold' : 'text-cyan-400'}>
              {completedCount} / {lab.objectives.length} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isAllComplete ? 'bg-emerald-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isAllComplete && (
        <div className="bg-emerald-950/70 border-b border-emerald-800/80 p-3 px-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Lab Verified! All objectives passed.</span>
          </div>
          {hasNextLab && onNextLab && (
            <button
              onClick={onNextLab}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors whitespace-nowrap shadow-sm"
            >
              <span>Next Lab</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Objectives List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Lab Tasks & Evaluation Rules
        </h3>

        {lab.objectives.map((obj, idx) => {
          const completed = obj.isCompleted(devMap, links);
          const hintOpen = expandedHints[obj.id];
          const solutionOpen = expandedSolutions[obj.id];

          return (
            <div
              key={obj.id}
              className={`p-3 rounded-lg border transition-all ${
                completed
                  ? 'bg-emerald-950/15 border-emerald-800/50 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`text-xs font-medium leading-snug ${
                        completed ? 'text-emerald-200' : 'text-slate-200'
                      }`}
                    >
                      <strong className="font-mono text-slate-400 mr-1.5">{idx + 1}.</strong>
                      {obj.description}
                    </p>
                  </div>

                  {/* Actions: Hint & Solution */}
                  <div className="flex items-center gap-3 mt-2 text-[11px]">
                    <button
                      onClick={() => toggleHint(obj.id)}
                      className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>{hintOpen ? 'Hide Hint' : 'Hint'}</span>
                    </button>

                    <button
                      onClick={() => toggleSolution(obj.id)}
                      className="text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      {solutionOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>{solutionOpen ? 'Hide Solution' : 'CLI Solution'}</span>
                    </button>
                  </div>

                  {/* Hint Dropdown */}
                  {hintOpen && (
                    <div className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded text-[11px] text-cyan-300/90 font-mono">
                      {obj.hint}
                    </div>
                  )}

                  {/* Solution Dropdown */}
                  {solutionOpen && (
                    <div className="mt-2 p-2 bg-slate-950 border border-amber-900/40 rounded">
                      <div className="flex items-center justify-between text-[10px] text-amber-400/80 mb-1 font-mono">
                        <span>Solution Command:</span>
                        <button
                          onClick={() => handleCopy(obj.id, obj.solutionCommand)}
                          className="hover:text-amber-200 flex items-center gap-0.5"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>{copiedId === obj.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="text-[11px] text-amber-200 font-mono whitespace-pre-wrap">
                        {obj.solutionCommand}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Verification Tips Section */}
        {lab.verificationTips.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono mb-2">
              Verification Checkpoints
            </h4>
            <ul className="space-y-1 text-xs text-slate-400">
              {lab.verificationTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-1.5 font-mono text-[11px]">
                  <span className="text-cyan-400 select-none">›</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs">
        <button
          onClick={onResetLab}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Lab State</span>
        </button>

        {hasNextLab && onNextLab && (
          <button
            onClick={onNextLab}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors"
          >
            <span>Next Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
