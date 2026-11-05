'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Save,
  Copy,
  Check,
  RotateCcw,
  FileCode2,
  AlertCircle,
  Download,
} from 'lucide-react';

const CodeMirrorDynamic = dynamic(() => import('./CodeMirrorWrapper'), {
  ssr: false,
  loading: () => (
    <div className="h-96 flex items-center justify-center text-xs text-[#8B93A7] bg-[#07080B] rounded-xl border border-white/6 font-mono">
      Loading CodeMirror editor...
    </div>
  ),
});

interface CodeEditorProps {
  filePath: string;
  originalContent: string;
  onSave: (path: string, newContent: string) => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  filePath,
  originalContent,
  onSave,
  readOnly = false,
}) => {
  const [content, setContent] = useState(originalContent);
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  const [prevFilePath, setPrevFilePath] = useState(filePath);
  const [prevOriginalContent, setPrevOriginalContent] = useState(originalContent);

  if (filePath !== prevFilePath || originalContent !== prevOriginalContent) {
    setPrevFilePath(filePath);
    setPrevOriginalContent(originalContent);
    setContent(originalContent);
    setIsDirty(false);
  }

  const handleChange = (val: string) => {
    setContent(val);
    setIsDirty(val !== originalContent);
  };

  const handleSave = () => {
    onSave(filePath, content);
    setIsDirty(false);
  };

  const handleRevert = () => {
    setContent(originalContent);
    setIsDirty(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'file.kt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Editor Sub-Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0E1016] border border-white/8 text-xs shrink-0">
        <div className="flex items-center gap-2 font-mono text-white/90 min-w-0">
          <FileCode2 className="w-4 h-4 text-[#3DDC84] shrink-0" />
          <span className="truncate">{filePath}</span>
          {isDirty && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F5B84B]/15 text-[#F5B84B] border border-[#F5B84B]/30">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/6 transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3DDC84]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/6 transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {isDirty && (
            <>
              <button
                onClick={handleRevert}
                className="px-2.5 py-1 rounded-lg text-[11px] text-[#8B93A7] hover:text-white hover:bg-white/6 transition-colors"
              >
                Revert
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#3DDC84] text-[#07080B] text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* CodeMirror 6 Editor Container */}
      <div className="flex-1 min-h-[420px] rounded-xl overflow-hidden bg-[#07080B]">
        <CodeMirrorDynamic
          value={content}
          onChange={handleChange}
          height="100%"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};
