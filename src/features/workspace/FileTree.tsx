'use client';

import React, { useState } from 'react';
import {
  Folder,
  FileCode2,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Smartphone,
  Cpu,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface FileTreeProps {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string, initialContent?: string) => void;
  onDeleteFile: (path: string) => void;
  onOpenMemory: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onOpenMemory,
}) => {
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  const allPaths = Object.keys(files).sort();

  // Categorize files into clean Android buckets
  const screens = allPaths.filter((p) => p.includes('Screen.kt'));
  const kotlinOther = allPaths.filter(
    (p) => p.endsWith('.kt') && !p.includes('Screen.kt')
  );
  const gradleFiles = allPaths.filter(
    (p) => p.endsWith('.gradle.kts') || p.endsWith('.toml') || p.endsWith('.pro')
  );
  const resFiles = allPaths.filter((p) => p.includes('/res/'));
  const otherFiles = allPaths.filter(
    (p) =>
      !screens.includes(p) &&
      !kotlinOther.includes(p) &&
      !gradleFiles.includes(p) &&
      !resFiles.includes(p)
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;
    const clean = newFilePath.trim().replace(/^\//, '');
    onCreateFile(clean, '// New Android file\n');
    setNewFilePath('');
    setIsNewFileModalOpen(false);
    onSelectFile(clean);
  };

  const renderFileRow = (path: string) => {
    const isSelected = path === activeFile;
    const fileName = path.split('/').pop() || path;
    const isMemory = path === '.builder/memory.json';
    const isKt = path.endsWith('.kt');

    return (
      <div
        key={path}
        onClick={() => (isMemory ? onOpenMemory() : onSelectFile(path))}
        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
          isSelected
            ? 'bg-[#3DDC84]/15 text-[#3DDC84] font-medium border border-[#3DDC84]/20'
            : 'text-[#8B93A7] hover:text-white hover:bg-white/4'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <FileCode2
            className={`w-3.5 h-3.5 shrink-0 ${
              isMemory ? 'text-[#8B5CF6]' : isKt ? 'text-[#3DDC84]' : 'text-[#22D3EE]'
            }`}
          />
          <span className="truncate">{fileName}</span>
        </div>

        {path !== 'settings.gradle.kts' &&
          path !== 'gradle/libs.versions.toml' &&
          !path.endsWith('MainActivity.kt') &&
          !isMemory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete file "${fileName}"?`)) {
                  onDeleteFile(path);
                }
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-[#FF5C6C] transition-opacity"
              title="Delete File"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* File Tree Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/8 text-xs font-semibold text-white">
        <span className="font-mono text-[#8B93A7] uppercase text-[11px] tracking-wider">
          Project Files ({allPaths.length})
        </span>

        <button
          onClick={() => setIsNewFileModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/6 hover:bg-white/10 text-white text-[11px] font-medium transition-colors"
        >
          <Plus className="w-3 h-3 text-[#3DDC84]" />
          <span>New</span>
        </button>
      </div>

      {/* Memory Highlight Button */}
      <button
        onClick={onOpenMemory}
        className="w-full text-left p-2.5 rounded-xl bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#8B5CF6]" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">.builder/memory.json</span>
            <span className="text-[10px] text-[#8B93A7]">Active Project Architecture</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#8B93A7]" />
      </button>

      {/* Categorized Tree */}
      <div className="space-y-3 pr-1 overflow-y-auto max-h-[70vh]">
        {/* Compose Screens */}
        {screens.length > 0 && (
          <div>
            <span className="text-[10px] font-mono text-[#3DDC84] font-medium tracking-wider uppercase block px-1 mb-1">
              Compose Screens ({screens.length})
            </span>
            <div className="space-y-0.5">{screens.map(renderFileRow)}</div>
          </div>
        )}

        {/* Kotlin Core */}
        {kotlinOther.length > 0 && (
          <div>
            <span className="text-[10px] font-mono text-[#22D3EE] font-medium tracking-wider uppercase block px-1 mb-1">
              Kotlin Core & Theme ({kotlinOther.length})
            </span>
            <div className="space-y-0.5">{kotlinOther.map(renderFileRow)}</div>
          </div>
        )}

        {/* Gradle & Config */}
        {gradleFiles.length > 0 && (
          <div>
            <span className="text-[10px] font-mono text-[#8B93A7] font-medium tracking-wider uppercase block px-1 mb-1">
              Gradle & Build ({gradleFiles.length})
            </span>
            <div className="space-y-0.5">{gradleFiles.map(renderFileRow)}</div>
          </div>
        )}

        {/* Resources XML */}
        {resFiles.length > 0 && (
          <div>
            <span className="text-[10px] font-mono text-[#8B93A7] font-medium tracking-wider uppercase block px-1 mb-1">
              Resources & Drawables ({resFiles.length})
            </span>
            <div className="space-y-0.5">{resFiles.map(renderFileRow)}</div>
          </div>
        )}

        {/* Other */}
        {otherFiles.length > 0 && (
          <div>
            <span className="text-[10px] font-mono text-[#8B93A7] font-medium tracking-wider uppercase block px-1 mb-1">
              Other Files ({otherFiles.length})
            </span>
            <div className="space-y-0.5">{otherFiles.map(renderFileRow)}</div>
          </div>
        )}
      </div>

      {/* Create File Modal */}
      <Modal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        title="Create New File"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
              Relative File Path
            </label>
            <input
              type="text"
              required
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="app/src/main/java/.../NewScreen.kt"
              className="w-full px-3 py-2 rounded-xl bg-[#141722] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#3DDC84]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewFileModalOpen(false)}
              className="px-3.5 py-2 text-xs text-[#8B93A7] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#07080B] bg-[#3DDC84] hover:opacity-90"
            >
              Create File
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
