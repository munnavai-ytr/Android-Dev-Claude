'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, Smartphone, Sparkles, Layers } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useProjectStore } from '../../store/useProjectStore';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdea?: string;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  initialIdea = '',
}) => {
  const router = useRouter();
  const createProject = useProjectStore((state) => state.createProject);

  const [name, setName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [idea, setIdea] = useState(initialIdea);
  const [architecture, setArchitecture] = useState('MVI + Clean Architecture + Compose');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate package name when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    const clean = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
    setPackageName(`com.droidforge.${clean || 'app'}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const newProj = await createProject({
      name: name.trim(),
      packageName: packageName.trim(),
      idea: idea.trim() || 'Native Android app with Jetpack Compose',
      architecture,
    });

    setIsSubmitting(false);
    onClose();
    router.push(`/project/${newProj.id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Native Android Project"
      subtitle="Initializes an Android Studio-ready Jetpack Compose structure stored in your browser."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name */}
        <div>
          <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
            Application Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={handleNameChange}
            placeholder="e.g., HabitForge or CryptoTracker"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white placeholder:text-[#8B93A7]/50 focus:outline-none focus:border-[#3DDC84] min-h-[42px]"
          />
        </div>

        {/* Package Name */}
        <div>
          <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
            Android Package Name
          </label>
          <input
            type="text"
            required
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="com.droidforge.habitforge"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs font-mono text-white placeholder:text-[#8B93A7]/50 focus:outline-none focus:border-[#3DDC84] min-h-[42px]"
          />
        </div>

        {/* App Idea / Brief */}
        <div>
          <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
            App Specification / Idea
          </label>
          <textarea
            rows={3}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe features, screens, local Room database requirements, sensor usage, or widgets..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white placeholder:text-[#8B93A7]/50 focus:outline-none focus:border-[#3DDC84] resize-none"
          />
        </div>

        {/* Architecture Pattern */}
        <div>
          <label className="block text-xs font-medium text-[#8B93A7] mb-1.5">
            Architecture Blueprint
          </label>
          <select
            value={architecture}
            onChange={(e) => setArchitecture(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none focus:border-[#3DDC84] min-h-[42px]"
          >
            <option value="MVI + Clean Architecture + Compose">
              MVI + Clean Architecture + Jetpack Compose (Recommended)
            </option>
            <option value="MVVM + Compose StateFlow">
              MVVM + StateFlow + Material 3
            </option>
            <option value="Standard Jetpack Compose BOM">
              Standard Compose BOM + Navigation Compose
            </option>
          </select>
        </div>

        {/* Target Specs Summary */}
        <div className="p-3 rounded-xl bg-white/4 border border-white/6 text-[11px] text-[#8B93A7] flex items-center justify-between">
          <span>Target Environment:</span>
          <span className="font-mono text-white">SDK 35 (Android 15) · Min SDK 26 · Java 17</span>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#8B93A7] hover:text-white hover:bg-white/5 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-[#07080B] bg-gradient-to-r from-[#3DDC84] to-[#22D3EE] hover:opacity-90 active:scale-95 transition-all min-h-[44px] shadow-sm disabled:opacity-50"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
