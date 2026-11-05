'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Settings,
  KeyRound,
  Download,
  Upload,
  Trash2,
  Palette,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { ModelPicker } from '../models/ModelPicker';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useKeyStore } from '../../store/useKeyStore';
import { useProjectStore } from '../../store/useProjectStore';

export const SettingsView: React.FC = () => {
  const {
    plannerModel,
    coderModel,
    fixerModel,
    accentTheme,
    setModelRole,
    setAccentTheme,
    exportBackupData,
    importBackupData,
    clearAllData,
  } = useSettingsStore();

  const keys = useKeyStore((state) => state.keys);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const loadKeys = useKeyStore((state) => state.loadKeys);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await exportBackupData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `droidforge-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importBackupData(text);
      setImportStatus(res);
      await loadProjects();
      await loadKeys();
    } catch (err: any) {
      setImportStatus({ success: false, message: err.message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearData = async () => {
    if (
      confirm(
        'WARNING: This will permanently delete all projects, local token statistics, and configured keys from your browser IndexedDB. Are you sure?'
      )
    ) {
      await clearAllData();
      await loadProjects();
      await loadKeys();
      alert('All local DroidForge data has been reset.');
    }
  };

  const themeOptions = [
    { id: 'android', label: 'Android Forge (Default)', color: '#3DDC84' },
    { id: 'violet', label: 'Agent Violet', color: '#8B5CF6' },
    { id: 'amber', label: 'Amber Core', color: '#F5B84B' },
    { id: 'cyan', label: 'Cyber Cyan', color: '#22D3EE' },
  ] as const;

  return (
    <div className="space-y-6 max-w-4xl w-full">
      {/* Title */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-[#3DDC84]" />
          Settings & Architecture Roles
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#8B93A7]">
          Configure role assignments, accent theme, data backup export/import, and privacy.
        </p>
      </div>

      {/* Model Roles Section */}
      <GlassCard radius={20} className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#3DDC84]" />
            <h2 className="text-sm font-semibold text-white">Three-Tier Architecture Model Roles</h2>
          </div>
          <Link
            href="/keys"
            className="text-xs text-[#22D3EE] hover:underline flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Manage Keys</span>
          </Link>
        </div>

        <p className="text-xs text-[#8B93A7] leading-relaxed">
          Assign verified AI models to distinct stages of Android app construction:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Planner Slot */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-white">Planner Role</span>
              <span className="text-[10px] font-mono text-[#8B93A7]">Architecture & Spec</span>
            </div>
            <ModelPicker
              roleLabel="Planner"
              selectedModelId={plannerModel}
              onSelectModel={(id) => setModelRole('planner', id)}
            />
            <p className="text-[10px] text-[#8B93A7] leading-tight">
              Designs module packages, Compose screens, and Room schemas.
            </p>
          </div>

          {/* Coder Slot */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-white">Coder Role</span>
              <span className="text-[10px] font-mono text-[#3DDC84]">Kotlin & Compose</span>
            </div>
            <ModelPicker
              roleLabel="Coder"
              selectedModelId={coderModel}
              onSelectModel={(id) => setModelRole('coder', id)}
            />
            <p className="text-[10px] text-[#8B93A7] leading-tight">
              Generates Kotlin files, Compose components, and Gradle scripts.
            </p>
          </div>

          {/* Fixer Slot */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-white">Fixer Role</span>
              <span className="text-[10px] font-mono text-[#22D3EE]">Linter & Diagnostics</span>
            </div>
            <ModelPicker
              roleLabel="Fixer"
              selectedModelId={fixerModel}
              onSelectModel={(id) => setModelRole('fixer', id)}
            />
            <p className="text-[10px] text-[#8B93A7] leading-tight">
              Verifies SDK 35 compatibility and resolves syntax discrepancies.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Theme Accent Section */}
      <GlassCard radius={20} className="p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/8">
          <Palette className="w-5 h-5 text-[#22D3EE]" />
          <h2 className="text-sm font-semibold text-white">Theme Accent</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {themeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setAccentTheme(opt.id)}
              className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all min-h-[46px] ${
                accentTheme === opt.id
                  ? 'bg-white/8 border-white/20 shadow-sm'
                  : 'bg-[#141722] border-white/6 hover:border-white/12 text-[#8B93A7]'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: opt.color }}
              />
              <span className="text-xs font-medium text-white truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Data Backup & Restore */}
      <GlassCard radius={20} className="p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/8">
          <Download className="w-5 h-5 text-[#3DDC84]" />
          <h2 className="text-sm font-semibold text-white">Data Management & JSON Portability</h2>
        </div>

        <p className="text-xs text-[#8B93A7] leading-relaxed">
          Export your workspaces, architecture memories, and local token telemetry to an encrypted
          JSON backup file, or restore a previous snapshot.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-white bg-white/8 hover:bg-white/12 border border-white/10 transition-all min-h-[44px]"
          >
            <Download className="w-4 h-4 text-[#3DDC84]" />
            <span>{isExporting ? 'Exporting...' : 'Export JSON Backup'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-white bg-white/8 hover:bg-white/12 border border-white/10 transition-all min-h-[44px]"
          >
            <Upload className="w-4 h-4 text-[#22D3EE]" />
            <span>Restore JSON Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {importStatus && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              importStatus.success
                ? 'bg-[#3DDC84]/10 border-[#3DDC84]/30 text-[#3DDC84]'
                : 'bg-[#FF5C6C]/10 border-[#FF5C6C]/30 text-[#FF5C6C]'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}
      </GlassCard>

      {/* Danger Zone: Clear all data */}
      <div className="p-5 rounded-2xl bg-[#FF5C6C]/5 border border-[#FF5C6C]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#FF5C6C] flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" />
            <span>Clear All Local Data</span>
          </h3>
          <p className="mt-1 text-xs text-[#8B93A7]">
            Wipes all projects, IndexedDB tables, and keys from this device.
          </p>
        </div>

        <button
          onClick={handleClearData}
          className="px-4 py-2 rounded-xl text-xs font-medium text-[#FF5C6C] hover:bg-[#FF5C6C]/10 border border-[#FF5C6C]/30 transition-colors shrink-0 min-h-[40px]"
        >
          Reset Database
        </button>
      </div>
    </div>
  );
};
