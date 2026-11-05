'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Smartphone,
  FileCode2,
  Copy,
  Check,
  Download,
  Layers,
  Code2,
  FolderTree,
  Sparkles,
  Info,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import type { DroidProject } from '../../lib/db';
import { GlassCard } from '../../components/ui/GlassCard';

interface ProjectDetailViewProps {
  projectId: string;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ projectId }) => {
  const router = useRouter();
  const selectProject = useProjectStore((state) => state.selectProject);
  const activeProject = useProjectStore((state) => state.activeProject);
  const [project, setProject] = useState<DroidProject | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    selectProject(projectId).then((p) => {
      if (isMounted && p) {
        setProject(p);
        const fileKeys = Object.keys(p.files || {});
        // Select MainActivity.kt or first file
        const main = fileKeys.find((k) => k.endsWith('MainActivity.kt')) || fileKeys[0] || '';
        setSelectedFile(main);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [projectId, selectProject]);

  if (!project) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#3DDC84] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-[#8B93A7]">Loading project from IndexedDB...</p>
      </div>
    );
  }

  const files = project.files || {};
  const fileList = Object.keys(files);
  const currentCode = files[selectedFile] || '';

  const handleCopy = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-2 rounded-xl bg-white/4 hover:bg-white/8 text-[#8B93A7] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-white tracking-tight">
                {project.name}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3DDC84]/10 text-[#3DDC84] border border-[#3DDC84]/20">
                SDK 35 Native
              </span>
            </div>
            <p className="text-xs font-mono text-[#8B93A7] mt-0.5">{project.packageName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-xs font-medium text-white transition-all min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>

      {/* Idea / Spec Banner */}
      {project.idea && (
        <div className="p-3.5 rounded-2xl bg-[#0E1016] border border-white/8 text-xs text-[#8B93A7] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#3DDC84] shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Specification:</strong> {project.idea}
          </div>
        </div>
      )}

      {/* 2-Pane Code & Files Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Left: Files Tree */}
        <GlassCard radius={20} className="p-4 lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <FolderTree className="w-4 h-4 text-[#22D3EE]" />
            <span>Project Files ({fileList.length})</span>
          </div>

          <div className="space-y-1">
            {fileList.map((filePath) => {
              const isSelected = filePath === selectedFile;
              const fileName = filePath.split('/').pop() || filePath;
              const isKt = filePath.endsWith('.kt');
              const isGradle = filePath.endsWith('.gradle.kts');

              return (
                <button
                  key={filePath}
                  onClick={() => setSelectedFile(filePath)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#3DDC84]/15 text-[#3DDC84] font-medium border border-[#3DDC84]/20'
                      : 'text-[#8B93A7] hover:text-white hover:bg-white/4'
                  }`}
                >
                  <span className="truncate">{fileName}</span>
                  <span className="text-[9px] uppercase px-1 rounded bg-black/40 text-[#8B93A7]">
                    {isKt ? 'KT' : isGradle ? 'KTS' : 'XML'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/6 text-[10px] text-[#8B93A7] space-y-1">
            <div className="flex justify-between">
              <span>Compose BOM:</span>
              <span className="font-mono text-white/90">2024.10.01</span>
            </div>
            <div className="flex justify-between">
              <span>Target SDK:</span>
              <span className="font-mono text-white/90">35 (Android 15)</span>
            </div>
          </div>
        </GlassCard>

        {/* Right: Code Viewer */}
        <GlassCard radius={20} className="p-4 lg:col-span-3 space-y-3 flex flex-col">
          {/* File Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/8 text-xs">
            <div className="flex items-center gap-2 font-mono text-white/90">
              <FileCode2 className="w-4 h-4 text-[#3DDC84]" />
              <span className="truncate">{selectedFile}</span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-xs font-medium text-white transition-all min-h-[34px]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#3DDC84]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Container */}
          <div className="p-4 rounded-xl bg-[#07080B] border border-white/6 overflow-x-auto">
            <pre className="font-mono text-xs text-white/90 leading-relaxed tab-size-4">
              <code>{currentCode}</code>
            </pre>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
