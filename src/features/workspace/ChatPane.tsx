'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  FileCode2,
  StopCircle,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Zap,
  ArrowRight,
  ChevronDown,
  Layers,
} from 'lucide-react';
import type { DroidProject, StoredApiKey } from '../../lib/db';
import type { AgentRunProgress, FileOperation } from '../agent/agentTypes';
import { AgentStepper } from './AgentStepper';
import { useKeyStore } from '../../store/useKeyStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  planSummary?: string;
  fileChanges?: Array<{ path: string; action: FileOperation['action']; diffStat: string }>;
  warnings?: string[];
  tokensUsed?: number;
  timestamp: number;
}

interface ChatPaneProps {
  project: DroidProject;
  messages: ChatMessage[];
  currentProgress?: AgentRunProgress | null;
  isRunning: boolean;
  onSendMessage: (prompt: string) => void;
  onStop: () => void;
  onSelectFile: (path: string) => void;
  onOpenModelSettings: () => void;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  project,
  messages,
  currentProgress,
  isRunning,
  onSendMessage,
  onStop,
  onSelectFile,
  onOpenModelSettings,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const plannerModel = useSettingsStore((state) => state.plannerModel);
  const coderModel = useSettingsStore((state) => state.coderModel);
  const keys = useKeyStore((state) => state.keys);
  const validKeysCount = keys.filter((k) => k.status === 'valid').length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentProgress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRunning) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleQuickPrompt = (promptText: string) => {
    if (isRunning) return;
    onSendMessage(promptText);
  };

  const quickChips = [
    'Add Room database for offline caching',
    'Add Glance App Widget for Home Screen',
    'Implement Navigation Compose with bottom tabs',
    'Add Material 3 Dynamic Color & dark theme',
  ];

  return (
    <div className="flex flex-col h-full bg-[#0E1016]/95 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
      {/* Chat Header with Model Role Switcher */}
      <div className="flex items-center justify-between p-3 border-b border-white/8 bg-[#07080B]/60 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#3DDC84] to-[#22D3EE] flex items-center justify-center p-0.5 shadow-sm">
            <Bot className="w-4 h-4 text-[#07080B]" />
          </div>
          <span className="font-semibold text-white tracking-tight">AI Forge Assistant</span>
        </div>

        <button
          onClick={onOpenModelSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/4 hover:bg-white/8 border border-white/6 text-white/80 transition-colors"
          title="Configure Planner & Coder models"
        >
          <span className="font-mono text-[10px] text-[#3DDC84]">
            {coderModel.split('/').pop() || 'gemini-2.5-flash'}
          </span>
          <Settings2 className="w-3.5 h-3.5 text-[#8B93A7]" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Intro Card */}
        {messages.length === 0 && (
          <div className="p-4 rounded-xl bg-white/3 border border-white/6 space-y-2 text-xs">
            <span className="text-[11px] font-mono text-[#3DDC84] font-medium uppercase tracking-wider block">
              Native Android Project Initialized
            </span>
            <p className="text-white/90 font-medium">
              Ready to craft screens, Room databases, viewmodels, and widgets for {project.name}.
            </p>
            <p className="text-[#8B93A7] leading-relaxed text-[11px]">
              Type any feature below or pick a quick blueprint. The agent runs a 4-stage pipeline
              (Understand → Plan → Generate → Review) and updates your project memory safely.
            </p>

            <div className="pt-2 flex flex-wrap gap-1.5">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(chip)}
                  disabled={isRunning}
                  className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/6 text-[10px] text-[#8B93A7] hover:text-white transition-colors disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((m) => {
          const isUser = m.role === 'user';

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#3DDC84]/15 border border-[#3DDC84]/30 text-white rounded-br-sm'
                    : 'bg-[#141722] border border-white/8 text-white/90 rounded-bl-sm'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#8B93A7]">
                  {isUser ? <User className="w-3 h-3 text-[#3DDC84]" /> : <Bot className="w-3 h-3 text-[#22D3EE]" />}
                  <span>{isUser ? 'You' : 'DroidForge Agent'}</span>
                  <span>·</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* File Change Cards */}
                {m.fileChanges && m.fileChanges.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/8 space-y-1.5">
                    <span className="text-[10px] font-mono text-[#8B93A7] uppercase tracking-wider block">
                      Files Modified ({m.fileChanges.length}):
                    </span>
                    <div className="space-y-1">
                      {m.fileChanges.map((change, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectFile(change.path)}
                          className="w-full text-left p-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/6 transition-all flex items-center justify-between text-[11px] group"
                        >
                          <div className="flex items-center gap-2 truncate pr-2 font-mono">
                            <FileCode2 className="w-3.5 h-3.5 text-[#3DDC84] shrink-0" />
                            <span className="truncate text-white/90 group-hover:text-[#3DDC84] transition-colors">
                              {change.path}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                              change.action === 'create'
                                ? 'bg-[#3DDC84]/20 text-[#3DDC84]'
                                : change.action === 'delete'
                                ? 'bg-[#FF5C6C]/20 text-[#FF5C6C]'
                                : 'bg-[#22D3EE]/20 text-[#22D3EE]'
                            }`}
                          >
                            {change.diffStat}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Warnings if any */}
                {m.warnings && m.warnings.length > 0 && (
                  <div className="mt-2.5 p-2 rounded-lg bg-[#F5B84B]/10 border border-[#F5B84B]/20 text-[11px] text-[#F5B84B] space-y-1">
                    <div className="flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Review Heuristics ({m.warnings.length})</span>
                    </div>
                    {m.warnings.slice(0, 3).map((w, idx) => (
                      <p key={idx} className="text-[10px] leading-tight">
                        • {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Stepper & Progress */}
        {currentProgress && isRunning && (
          <div className="pt-2">
            <AgentStepper
              stage={currentProgress.stage}
              currentMessage={currentProgress.currentStepMessage}
              tokensUsed={currentProgress.tokensUsed}
              onStop={onStop}
              isStreaming={currentProgress.isStreaming}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/8 bg-[#07080B]/80 shrink-0">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={2}
            placeholder={
              validKeysCount === 0
                ? 'Add your API key in Key Vault to begin AI code generation...'
                : 'Describe an Android feature (e.g. Add a biometric lock screen or Room database)...'
            }
            disabled={isRunning}
            className="w-full pl-3 pr-12 py-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white placeholder:text-[#8B93A7]/60 focus:outline-none focus:border-[#3DDC84] resize-none leading-relaxed"
          />

          <div className="absolute right-2.5 bottom-2.5">
            {isRunning ? (
              <button
                type="button"
                onClick={onStop}
                className="p-2 rounded-lg bg-[#FF5C6C] text-white hover:opacity-90 transition-opacity"
                title="Stop generation"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-[#3DDC84] text-[#07080B] hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
