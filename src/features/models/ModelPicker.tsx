'use client';

import React, { useState, useMemo } from 'react';
import { Search, Sparkles, Check, ChevronDown, Layers, Zap } from 'lucide-react';
import { useKeyStore } from '../../store/useKeyStore';
import type { ModelMetadata } from '../../lib/db';
import { Modal } from '../../components/ui/Modal';

interface ModelPickerProps {
  selectedModelId: string;
  onSelectModel: (modelId: string, model?: ModelMetadata) => void;
  roleLabel?: string;
  disabled?: boolean;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
  selectedModelId,
  onSelectModel,
  roleLabel,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'gemini' | 'openrouter'>('all');
  const [freeOnly, setFreeOnly] = useState(false);

  const keys = useKeyStore((state) => state.keys);

  // Collect all unique models from valid keys
  const allModels = useMemo(() => {
    const list: ModelMetadata[] = [];
    const seen = new Set<string>();

    for (const k of keys) {
      if (k.status === 'valid' && Array.isArray(k.modelsList)) {
        for (const m of k.modelsList) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            list.push(m);
          }
        }
      }
    }

    return list;
  }, [keys]);

  // Find currently selected model object
  const currentModel = useMemo(() => {
    return allModels.find((m) => m.id === selectedModelId);
  }, [allModels, selectedModelId]);

  // Filtered models
  const filteredModels = useMemo(() => {
    return allModels.filter((m) => {
      if (filterProvider !== 'all' && m.provider !== filterProvider) return false;
      if (freeOnly && !m.isFree) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          (m.description && m.description.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [allModels, filterProvider, freeOnly, searchQuery]);

  // Group by provider
  const groupedModels = useMemo(() => {
    const gemini = filteredModels.filter((m) => m.provider === 'gemini');
    const openrouter = filteredModels.filter((m) => m.provider === 'openrouter');
    return { gemini, openrouter };
  }, [filteredModels]);

  const handleSelect = (model: ModelMetadata) => {
    onSelectModel(model.id, model);
    setIsOpen(false);
  };

  const formatContextLength = (len?: number) => {
    if (!len) return '';
    if (len >= 1000000) return `${(len / 1000000).toFixed(0)}M ctx`;
    if (len >= 1000) return `${Math.round(len / 1000)}k ctx`;
    return `${len} ctx`;
  };

  return (
    <div>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled || allModels.length === 0}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-[#141722] border border-white/8 hover:border-white/16 transition-all text-left min-h-[46px] disabled:opacity-50"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
              currentModel?.provider === 'openrouter'
                ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]'
                : 'bg-[#3DDC84]/15 text-[#3DDC84]'
            }`}
          >
            {currentModel?.provider === 'openrouter' ? 'OR' : 'GEM'}
          </div>
          <div className="truncate">
            <span className="text-xs font-medium text-white block truncate">
              {currentModel?.name || selectedModelId || 'Select a Model'}
            </span>
            <span className="text-[10px] font-mono text-[#8B93A7] truncate">
              {selectedModelId || 'No model chosen'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentModel?.isFree && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#3DDC84]/10 text-[#3DDC84]">
              Free
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-[#8B93A7]" />
        </div>
      </button>

      {/* Model Selection Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={roleLabel ? `Select ${roleLabel} Model` : 'Select AI Model'}
        subtitle={`Browse ${allModels.length} validated models available in your key vault.`}
        maxWidth="lg"
      >
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B93A7]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models (e.g., flash, sonnet, llama, qwen)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#141722] border border-white/8 text-xs text-white placeholder:text-[#8B93A7]/50 focus:outline-none focus:border-[#3DDC84]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterProvider('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterProvider === 'all'
                    ? 'bg-white/10 text-white'
                    : 'text-[#8B93A7] hover:text-white'
                }`}
              >
                All Providers ({allModels.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterProvider('gemini')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterProvider === 'gemini'
                    ? 'bg-[#3DDC84]/20 text-[#3DDC84]'
                    : 'text-[#8B93A7] hover:text-white'
                }`}
              >
                Gemini
              </button>
              <button
                type="button"
                onClick={() => setFilterProvider('openrouter')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterProvider === 'openrouter'
                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                    : 'text-[#8B93A7] hover:text-white'
                }`}
              >
                OpenRouter
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFreeOnly(!freeOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                freeOnly
                  ? 'bg-[#3DDC84]/15 border-[#3DDC84]/40 text-[#3DDC84]'
                  : 'border-white/8 text-[#8B93A7] hover:text-white'
              }`}
            >
              Free Models Only
            </button>
          </div>

          {/* List of Models */}
          <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1 divide-y divide-white/6">
            {/* Gemini Section */}
            {groupedModels.gemini.length > 0 && (
              <div className="pt-2 first:pt-0">
                <span className="text-[11px] font-mono text-[#3DDC84] font-medium tracking-wider uppercase block mb-2">
                  Google Gemini ({groupedModels.gemini.length})
                </span>
                <div className="space-y-1">
                  {groupedModels.gemini.map((m) => {
                    const isSelected = m.id === selectedModelId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelect(m)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#3DDC84]/15 border border-[#3DDC84]/30'
                            : 'hover:bg-white/4'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {m.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#3DDC84] px-1.5 rounded bg-[#3DDC84]/10">
                              Free Tier
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#8B93A7] block truncate">
                            {m.id} {m.contextLength ? `· ${formatContextLength(m.contextLength)}` : ''}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#3DDC84] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OpenRouter Section */}
            {groupedModels.openrouter.length > 0 && (
              <div className="pt-3">
                <span className="text-[11px] font-mono text-[#8B93A7] font-medium tracking-wider uppercase block mb-2">
                  OpenRouter ({groupedModels.openrouter.length})
                </span>
                <div className="space-y-1">
                  {groupedModels.openrouter.map((m) => {
                    const isSelected = m.id === selectedModelId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelect(m)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#8B5CF6]/15 border border-[#8B5CF6]/30'
                            : 'hover:bg-white/4'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {m.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1.5 rounded ${
                                m.isFree
                                  ? 'bg-[#3DDC84]/10 text-[#3DDC84]'
                                  : 'bg-white/6 text-[#8B93A7]'
                              }`}
                            >
                              {m.isFree ? 'Free' : 'Paid'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#8B93A7] block truncate">
                            {m.id} {m.contextLength ? `· ${formatContextLength(m.contextLength)}` : ''}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredModels.length === 0 && (
              <div className="py-8 text-center text-xs text-[#8B93A7]">
                No models matched your search or filter.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
