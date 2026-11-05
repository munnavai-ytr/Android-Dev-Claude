'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Smartphone,
  FolderGit2,
  Cpu,
  History,
  Download,
  Terminal,
  MessageSquare,
  FileCode2,
  Eye,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { DroidProject, ProjectSnapshot } from '../../lib/db';
import { getDb } from '../../lib/db';
import { useProjectStore } from '../../store/useProjectStore';
import { useKeyStore } from '../../store/useKeyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { ChatPane, type ChatMessage } from './ChatPane';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { PreviewBuildPane } from './PreviewBuildPane';
import { MemoryPanel } from './MemoryPanel';
import { VersionHistoryModal } from './VersionHistoryModal';
import { runAgentPipeline } from '../agent/agentRunner';
import type { AgentRunProgress } from '../agent/agentTypes';
import { readProjectMemory } from '../agent/projectMemory';

interface WorkspaceLayoutProps {
  projectId: string;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ projectId }) => {
  const router = useRouter();
  const selectProject = useProjectStore((state) => state.selectProject);
  const activeProject = useProjectStore((state) => state.activeProject);
  const updateProjectFiles = useProjectStore((state) => state.updateProjectFiles);
  const updateFileContent = useProjectStore((state) => state.updateFileContent);
  const deleteProjectFile = useProjectStore((state) => state.deleteProjectFile);
  const restoreSnapshot = useProjectStore((state) => state.restoreSnapshot);
  const snapshots = useProjectStore((state) => state.snapshots);

  const keys = useKeyStore((state) => state.keys);
  const plannerModel = useSettingsStore((state) => state.plannerModel);
  const coderModel = useSettingsStore((state) => state.coderModel);

  // Mobile Tabs
  const [mobileTab, setMobileTab] = useState<'chat' | 'files' | 'preview' | 'build'>('chat');

  // File selection
  const [activeFile, setActiveFile] = useState<string>('');

  // Modals
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Chat & Agent Pipeline State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<AgentRunProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    selectProject(projectId).then((p) => {
      if (isMounted && p) {
        const fileKeys = Object.keys(p.files || {});
        const main = fileKeys.find((k) => k.endsWith('MainActivity.kt')) || fileKeys[0] || '';
        setActiveFile(main);
      }
    });

    // Load persisted chat messages from IndexedDB
    if (typeof window !== 'undefined') {
      const db = getDb();
      db.chatMessages
        .where('projectId')
        .equals(projectId)
        .sortBy('timestamp')
        .then((records) => {
          if (isMounted && records.length > 0) {
            setMessages(
              records.map((r) => ({
                id: r.id,
                role: r.role,
                content: r.content,
                fileChanges: r.fileChanges,
                warnings: r.warnings,
                tokensUsed: r.tokensUsed,
                timestamp: r.timestamp,
              }))
            );
          }
        })
        .catch((err) => console.warn('Could not load chat messages:', err));
    }

    return () => {
      isMounted = false;
    };
  }, [projectId, selectProject]);

  if (!activeProject) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#3DDC84] border-t-transparent animate-spin" />
        <span className="text-xs text-[#8B93A7] font-mono">Loading Android Workspace...</span>
      </div>
    );
  }

  const projectMemory = readProjectMemory(
    activeProject.files,
    activeProject.name,
    activeProject.packageName
  );

  // Handle agent message dispatch
  const handleSendMessage = async (prompt: string) => {
    if (!prompt.trim() || isRunning) return;

    // Pick keys
    const validKeys = keys.filter((k) => k.status === 'valid');
    if (validKeys.length === 0) {
      alert('Please add a valid Google Gemini or OpenRouter key in the Key Vault first.');
      router.push('/keys');
      return;
    }

    // Default: use first valid key for planner and coder, or match providers
    const plannerKey = validKeys.find((k) => k.provider === 'gemini') || validKeys[0];
    const coderKey = validKeys.find((k) => k.provider === 'openrouter') || validKeys[0];

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);

    // Persist user message to IndexedDB
    const db = getDb();
    db.chatMessages.add({
      id: userMsg.id,
      projectId: activeProject.id,
      role: 'user',
      content: prompt,
      timestamp: userMsg.timestamp,
    });

    setIsRunning(true);
    abortControllerRef.current = new AbortController();

    try {
      const result = await runAgentPipeline({
        project: activeProject,
        userPrompt: prompt,
        plannerKey,
        coderKey,
        plannerModel,
        coderModel,
        abortSignal: abortControllerRef.current.signal,
        onProgress: (prog) => {
          setCurrentProgress(prog);
        },
      });

      // Update project files and save snapshot
      await updateProjectFiles(
        activeProject.id,
        result.updatedProject.files,
        [],
        `Agent: ${prompt.slice(0, 40)}`
      );

      // Assistant response message
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Successfully applied code updates for: "${prompt}". All static syntax and review checks passed.`,
        fileChanges: result.appliedChanges,
        warnings: result.reviewResult.warnings.map((w) => w.message),
        tokensUsed: result.tokensUsed,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      db.chatMessages.add({
        id: assistantMsg.id,
        projectId: activeProject.id,
        role: 'assistant',
        content: assistantMsg.content,
        fileChanges: result.appliedChanges,
        warnings: assistantMsg.warnings,
        tokensUsed: result.tokensUsed,
        timestamp: assistantMsg.timestamp,
      });

      // Select first modified file in editor
      if (result.appliedChanges.length > 0) {
        setActiveFile(result.appliedChanges[0].path);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: err.message || 'An error occurred during agent execution.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsRunning(false);
      setCurrentProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleEditorSave = async (path: string, newContent: string) => {
    await updateFileContent(activeProject.id, path, newContent);
  };

  const handleCreateFile = async (path: string, initialContent?: string) => {
    await updateFileContent(activeProject.id, path, initialContent || '');
  };

  const handleDeleteFile = async (path: string) => {
    await deleteProjectFile(activeProject.id, path);
    const remaining = Object.keys(activeProject.files).filter((p) => p !== path);
    setActiveFile(remaining[0] || '');
  };

  const handleRestoreCheckpoint = async (snapshotId: string) => {
    await restoreSnapshot(activeProject.id, snapshotId);
  };

  const currentFileContent = activeProject.files[activeFile] || '';

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-w-full w-full space-y-3">
      {/* Workspace Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#0E1016] border border-white/8 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/projects"
            className="p-1.5 rounded-lg text-[#8B93A7] hover:text-white hover:bg-white/6 transition-colors"
            title="Back to Projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                {activeProject.name}
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#3DDC84]/10 text-[#3DDC84] border border-[#3DDC84]/20 shrink-0">
                SDK 35
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#8B93A7] truncate">
              {activeProject.packageName}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsMemoryOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 text-xs text-white/90 transition-colors"
            title="View Project Memory"
          >
            <Cpu className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span className="hidden sm:inline text-[11px]">Memory</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 text-xs text-white/90 transition-colors"
            title="Snapshot History"
          >
            <History className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="hidden sm:inline text-[11px]">History ({snapshots.length})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {/* DESKTOP 3-PANE LAYOUT (>= 1024px) */}
      <div className="hidden lg:grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Pane 1: Chat Assistant (col-span-4) */}
        <div className="col-span-4 h-full min-h-0">
          <ChatPane
            project={activeProject}
            messages={messages}
            currentProgress={currentProgress}
            isRunning={isRunning}
            onSendMessage={handleSendMessage}
            onStop={handleStop}
            onSelectFile={(p) => setActiveFile(p)}
            onOpenModelSettings={() => router.push('/settings')}
          />
        </div>

        {/* Pane 2: File Tree + CodeMirror Editor (col-span-5) */}
        <div className="col-span-5 h-full min-h-0 flex gap-2">
          {/* File Tree Left Strip */}
          <div className="w-48 bg-[#0E1016]/95 border border-white/8 rounded-2xl p-3 flex flex-col shrink-0 overflow-y-auto">
            <FileTree
              files={activeProject.files}
              activeFile={activeFile}
              onSelectFile={(p) => setActiveFile(p)}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onOpenMemory={() => setIsMemoryOpen(true)}
            />
          </div>

          {/* Editor Right Area */}
          <div className="flex-1 min-w-0 bg-[#0E1016]/95 border border-white/8 rounded-2xl p-3 flex flex-col">
            <CodeEditor
              key={activeFile}
              filePath={activeFile}
              originalContent={currentFileContent}
              onSave={handleEditorSave}
            />
          </div>
        </div>

        {/* Pane 3: Preview & Build (col-span-3) */}
        <div className="col-span-3 h-full min-h-0">
          <PreviewBuildPane project={activeProject} mode="preview" />
        </div>
      </div>

      {/* MOBILE SINGLE-PANE VIEW (< 1024px) WITH BOTTOM TABS */}
      <div className="lg:hidden flex-1 flex flex-col min-h-0 pb-12">
        <div className="flex-1 min-h-0">
          {mobileTab === 'chat' && (
            <ChatPane
              project={activeProject}
              messages={messages}
              currentProgress={currentProgress}
              isRunning={isRunning}
              onSendMessage={handleSendMessage}
              onStop={handleStop}
              onSelectFile={(p) => {
                setActiveFile(p);
                setMobileTab('files');
              }}
              onOpenModelSettings={() => router.push('/settings')}
            />
          )}

          {mobileTab === 'files' && (
            <div className="h-full flex flex-col gap-2">
              <div className="flex-1 min-h-0">
                <CodeEditor
                  key={activeFile}
                  filePath={activeFile}
                  originalContent={currentFileContent}
                  onSave={handleEditorSave}
                />
              </div>
              <div className="p-2 rounded-xl bg-[#0E1016] border border-white/8">
                <FileTree
                  files={activeProject.files}
                  activeFile={activeFile}
                  onSelectFile={(p) => setActiveFile(p)}
                  onCreateFile={handleCreateFile}
                  onDeleteFile={handleDeleteFile}
                  onOpenMemory={() => setIsMemoryOpen(true)}
                />
              </div>
            </div>
          )}

          {mobileTab === 'preview' && (
            <PreviewBuildPane project={activeProject} mode="preview" />
          )}

          {mobileTab === 'build' && (
            <PreviewBuildPane project={activeProject} mode="build" />
          )}
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="grid grid-cols-4 h-12 bg-[#0E1016] border-t border-white/8 mt-2 rounded-xl overflow-hidden shrink-0">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
              mobileTab === 'chat' ? 'text-[#3DDC84] bg-white/4' : 'text-[#8B93A7]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setMobileTab('files')}
            className={`flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
              mobileTab === 'files' ? 'text-[#3DDC84] bg-white/4' : 'text-[#8B93A7]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Files</span>
          </button>

          <button
            onClick={() => setMobileTab('preview')}
            className={`flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
              mobileTab === 'preview' ? 'text-[#3DDC84] bg-white/4' : 'text-[#8B93A7]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          <button
            onClick={() => setMobileTab('build')}
            className={`flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
              mobileTab === 'build' ? 'text-[#3DDC84] bg-white/4' : 'text-[#8B93A7]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Build</span>
          </button>
        </div>
      </div>

      {/* Project Memory Modal */}
      <MemoryPanel
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memory={projectMemory}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        snapshots={snapshots}
        onRestore={handleRestoreCheckpoint}
      />
    </div>
  );
};
