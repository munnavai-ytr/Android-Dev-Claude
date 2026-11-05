'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Smartphone,
  CheckCircle2,
  FileCode2,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import type { ProjectMemoryJson } from '../agent/agentTypes';
import { Modal } from '../../components/ui/Modal';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  memory: ProjectMemoryJson | null;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  isOpen,
  onClose,
  memory,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [copied, setCopied] = useState(false);

  if (!memory) return null;

  const rawJson = JSON.stringify(memory, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Memory (.builder/memory.json)"
      subtitle="Maintained across all agent runs to protect architecture and prevent breaking existing code."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Sub-Tabs */}
        <div className="flex items-center justify-between pb-2 border-b border-white/8 text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#141722]">
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'visual'
                  ? 'bg-white/10 text-white'
                  : 'text-[#8B93A7] hover:text-white'
              }`}
            >
              Structured View
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'json'
                  ? 'bg-white/10 text-white'
                  : 'text-[#8B93A7] hover:text-white'
              }`}
            >
              Raw JSON
            </button>
          </div>

          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-[#8B93A7] hover:text-white hover:bg-white/6 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#3DDC84]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Structured Visual Tab */}
        {activeTab === 'visual' ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Architecture Banner */}
            <div className="p-3 rounded-xl bg-[#141722] border border-white/8 space-y-1">
              <span className="text-[10px] font-mono text-[#3DDC84] uppercase tracking-wider block">
                Architecture Blueprint
              </span>
              <p className="text-xs font-semibold text-white">
                {memory.architectureSummary}
              </p>
              <p className="text-[11px] font-mono text-[#8B93A7]">
                {memory.packageName}
              </p>
            </div>

            {/* Screens List */}
            <div>
              <span className="text-[11px] font-mono text-[#22D3EE] uppercase tracking-wider block mb-2 font-medium">
                Registered Screens ({memory.screens?.length || 0})
              </span>
              <div className="space-y-1.5">
                {memory.screens?.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/4 border border-white/6 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-white block">{s.name}</span>
                      <span className="text-[11px] text-[#8B93A7]">{s.purpose}</span>
                    </div>
                    {s.route && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-[#22D3EE]">
                        route: {s.route}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture Decisions */}
            {memory.decisions && memory.decisions.length > 0 && (
              <div>
                <span className="text-[11px] font-mono text-[#F5B84B] uppercase tracking-wider block mb-2 font-medium">
                  Architecture Decisions
                </span>
                <div className="space-y-1">
                  {memory.decisions.map((dec, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-black/30 border border-white/4 text-xs text-[#8B93A7] flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3DDC84] shrink-0 mt-0.5" />
                      <span>{dec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Purpose Index */}
            {memory.fileIndex && (
              <div>
                <span className="text-[11px] font-mono text-[#8B93A7] uppercase tracking-wider block mb-2 font-medium">
                  File Index ({Object.keys(memory.fileIndex).length})
                </span>
                <div className="space-y-1">
                  {Object.entries(memory.fileIndex).map(([p, pur]) => (
                    <div
                      key={p}
                      className="p-2 rounded-lg bg-white/2 border border-white/4 text-[11px] flex items-center justify-between gap-2"
                    >
                      <span className="font-mono text-white/90 truncate">{p}</span>
                      <span className="text-[#8B93A7] shrink-0">{pur}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#07080B] border border-white/6 max-h-[60vh] overflow-y-auto">
            <pre className="font-mono text-xs text-white/90 leading-relaxed">
              <code>{rawJson}</code>
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
};
