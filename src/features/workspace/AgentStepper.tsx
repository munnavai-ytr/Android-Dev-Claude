'use client';

import React from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  StopCircle,
  AlertTriangle,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { AgentStage } from '../agent/agentTypes';

interface AgentStepperProps {
  stage: AgentStage;
  currentMessage: string;
  tokensUsed: number;
  onStop?: () => void;
  isStreaming?: boolean;
}

export const AgentStepper: React.FC<AgentStepperProps> = ({
  stage,
  currentMessage,
  tokensUsed,
  onStop,
  isStreaming,
}) => {
  const steps: Array<{ id: AgentStage; label: string; num: string }> = [
    { id: 'understand', label: 'Understand', num: '1' },
    { id: 'plan', label: 'Plan', num: '2' },
    { id: 'generate', label: 'Generate', num: '3' },
    { id: 'review', label: 'Review', num: '4' },
  ];

  const getStepStatus = (stepId: AgentStage) => {
    const stageOrder: AgentStage[] = ['understand', 'plan', 'generate', 'review', 'completed'];
    const currentIndex = stageOrder.indexOf(stage);
    const stepIndex = stageOrder.indexOf(stepId);

    if (stage === 'error') {
      return stepIndex === currentIndex ? 'error' : stepIndex < currentIndex ? 'done' : 'pending';
    }

    if (stepIndex < currentIndex || stage === 'completed') return 'done';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const isRunning = stage !== 'idle' && stage !== 'completed' && stage !== 'error';

  if (stage === 'idle') return null;

  return (
    <div className="p-3.5 rounded-2xl bg-[#0E1016] border border-white/10 space-y-3 shadow-lg">
      {/* Stepper Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#3DDC84]" />
          <span className="text-xs font-semibold text-white tracking-tight">
            AI Agent Pipeline
          </span>
        </div>

        <div className="flex items-center gap-2">
          {tokensUsed > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/6 text-white/80 border border-white/6 flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#22D3EE]" />
              <span>{tokensUsed.toLocaleString()} tokens</span>
            </span>
          )}

          {isRunning && onStop && (
            <button
              onClick={onStop}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF5C6C]/10 hover:bg-[#FF5C6C]/20 text-[#FF5C6C] text-xs font-medium border border-[#FF5C6C]/30 transition-colors"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper Nodes */}
      <div className="grid grid-cols-4 gap-1 sm:gap-2">
        {steps.map((st) => {
          const status = getStepStatus(st.id);
          return (
            <div
              key={st.id}
              className={`p-2 rounded-xl text-center border transition-all ${
                status === 'active'
                  ? 'bg-[#3DDC84]/10 border-[#3DDC84]/40 text-white'
                  : status === 'done'
                  ? 'bg-white/4 border-white/10 text-white/90'
                  : 'bg-black/30 border-white/4 text-[#8B93A7]/60'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                {status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#3DDC84]" />
                ) : status === 'active' ? (
                  <Loader2 className="w-4 h-4 text-[#3DDC84] animate-spin" />
                ) : status === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-[#FF5C6C]" />
                ) : (
                  <Circle className="w-4 h-4 text-[#8B93A7]/40" />
                )}
              </div>
              <span className="text-[11px] font-medium block truncate">{st.label}</span>
            </div>
          );
        })}
      </div>

      {/* Progress Message Banner */}
      <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/6 text-xs text-[#8B93A7] flex items-center justify-between">
        <span className="truncate pr-2">{currentMessage}</span>
        {isStreaming && (
          <span className="text-[10px] font-mono text-[#3DDC84] shrink-0 animate-pulse">
            Streaming JSON...
          </span>
        )}
      </div>
    </div>
  );
};
