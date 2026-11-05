'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Plus,
  Search,
  Smartphone,
  Calendar,
  Layers,
  Trash2,
  Edit2,
  ArrowRight,
  FileCode2,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import type { DroidProject } from '../../lib/db';
import { GlassCard } from '../../components/ui/GlassCard';
import { CreateProjectModal } from './CreateProjectModal';
import { Modal } from '../../components/ui/Modal';

function formatRelativeTime(timestamp: number) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export const ProjectList: React.FC = () => {
  const projects = useProjectStore((state) => state.projects);
  const isLoading = useProjectStore((state) => state.isLoading);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const renameProject = useProjectStore((state) => state.renameProject);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<DroidProject | null>(null);
  const [newName, setNewName] = useState('');

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.packageName.toLowerCase().includes(query) ||
        p.idea.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const handleDelete = async (p: DroidProject, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete project "${p.name}"? This removes all generated files from your browser database.`)) {
      await deleteProject(p.id);
    }
  };

  const handleOpenRename = (p: DroidProject, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToRename(p);
    setNewName(p.name);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToRename || !newName.trim()) return;
    await renameProject(projectToRename.id, newName.trim());
    setProjectToRename(null);
  };

  return (
    <div className="space-y-6 max-w-5xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-[#3DDC84]" />
            Android Projects
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#8B93A7]">
            Native Kotlin & Compose workspaces stored locally in IndexedDB.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 active:scale-95 transition-all min-h-[44px] shadow-sm shadow-[#3DDC84]/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Android App</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B93A7]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects by name, idea, or package..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141722]/80 border border-white/8 text-xs text-white placeholder:text-[#8B93A7]/50 focus:outline-none focus:border-[#3DDC84] min-h-[42px]"
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((p) => {
          const fileCount = Object.keys(p.files || {}).length;

          return (
            <Link key={p.id} href={`/project/${p.id}`} className="group block">
              <GlassCard
                radius={20}
                interactive
                className="p-5 h-full flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3DDC84]/15 to-[#22D3EE]/15 border border-[#3DDC84]/20 flex items-center justify-center text-[#3DDC84] shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#3DDC84] transition-colors tracking-tight">
                          {p.name}
                        </h3>
                        <p className="text-[11px] font-mono text-[#8B93A7] truncate">
                          {p.packageName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleOpenRename(p, e)}
                        aria-label="Rename project"
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/6 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(p, e)}
                        aria-label="Delete project"
                        className="p-1.5 rounded-lg text-white/40 hover:text-[#FF5C6C] hover:bg-white/6 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {p.idea && (
                    <p className="mt-3 text-xs text-[#8B93A7] line-clamp-2 leading-relaxed">
                      {p.idea}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between text-xs text-[#8B93A7]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileCode2 className="w-3.5 h-3.5 text-[#22D3EE]" />
                      <span>{fileCount} files</span>
                    </span>
                    <span>·</span>
                    <span>{formatRelativeTime(p.updatedAt)}</span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/4 text-white/80 border border-white/6">
                    SDK 35
                  </span>
                </div>
              </GlassCard>
            </Link>
          );
        })}

        {filteredProjects.length === 0 && !isLoading && (
          <div className="col-span-full">
            <GlassCard radius={20} className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto text-[#8B93A7]">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">No Projects Found</h3>
              <p className="text-xs text-[#8B93A7] max-w-sm mx-auto">
                {searchQuery
                  ? 'No projects matched your search query.'
                  : 'Get started by creating your first native Android Jetpack Compose app.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 transition-opacity"
                >
                  Create Android App
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Rename Modal */}
      <Modal
        isOpen={!!projectToRename}
        onClose={() => setProjectToRename(null)}
        title="Rename Project"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveRename} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
              New Application Name
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none focus:border-[#3DDC84] min-h-[42px]"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setProjectToRename(null)}
              className="px-4 py-2 rounded-xl text-xs text-[#8B93A7] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#07080B] bg-[#3DDC84] hover:opacity-90"
            >
              Save Name
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
