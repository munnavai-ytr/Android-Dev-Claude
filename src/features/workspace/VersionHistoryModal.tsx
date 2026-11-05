'use client';

import React from 'react';
import { History, RotateCcw, Clock, CheckCircle2, FileCode2 } from 'lucide-react';
import type { ProjectSnapshot } from '../../lib/db';
import { Modal } from '../../components/ui/Modal';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: ProjectSnapshot[];
  onRestore: (snapshotId: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onRestore,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Version History"
      subtitle="Every AI generation creates an immutable local snapshot. You can restore any previous checkpoint in one tap."
      maxWidth="md"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {snapshots.map((snap, idx) => (
          <div
            key={snap.id}
            className="p-3.5 rounded-xl bg-[#141722] border border-white/8 flex items-center justify-between gap-3 text-xs"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">{snap.name}</span>
                {idx === 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#3DDC84]/10 text-[#3DDC84]">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#8B93A7] mt-0.5">
                <Clock className="w-3 h-3 text-[#22D3EE]" />
                <span>{new Date(snap.timestamp).toLocaleString()}</span>
                <span>·</span>
                <span>{snap.filesSummary}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm(`Restore checkpoint "${snap.name}"? This will revert your project files to this state.`)) {
                  onRestore(snap.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/12 text-white text-xs font-medium transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#3DDC84]" />
              <span>Restore</span>
            </button>
          </div>
        ))}

        {snapshots.length === 0 && (
          <p className="text-xs text-[#8B93A7] py-8 text-center">
            No snapshots recorded yet. Snapshots are created automatically before each code change.
          </p>
        )}
      </div>
    </Modal>
  );
};
