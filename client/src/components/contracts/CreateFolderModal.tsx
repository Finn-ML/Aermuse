import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FolderItem {
  id: string;
  name: string;
  color: string | null;
}

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  folder?: FolderItem; // If provided, we're editing
}

const PRESET_COLORS = [
  '#660033', // Brand burgundy
  '#8B0045', // Darker burgundy
  '#4B0082', // Indigo
  '#2E8B57', // Sea green
  '#D2691E', // Chocolate
  '#4169E1', // Royal blue
  '#9932CC', // Dark orchid
  '#DC143C', // Crimson
];

/**
 * Modal for creating or editing folders.
 * AC-1: Create custom folders with name
 * AC-2: Rename folders (when folder prop is provided)
 * AC-7: Folder color labels (optional)
 */
export function CreateFolderModal({ isOpen, onClose, onCreated, folder }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const isEditing = !!folder;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (folder) {
        setName(folder.name);
        setColor(folder.color || PRESET_COLORS[0]);
      } else {
        setName('');
        setColor(PRESET_COLORS[0]);
      }
      setError('');
    }
  }, [isOpen, folder]);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const res = await apiRequest('POST', '/api/folders', data);
      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || 'Failed to create folder');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Folder created' });
      onCreated();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const res = await apiRequest('PATCH', `/api/folders/${folder!.id}`, data);
      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || 'Failed to update folder');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Folder updated' });
      onCreated();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Folder name is required');
      return;
    }

    if (trimmedName.length > 255) {
      setError('Folder name must be 255 characters or less');
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ name: trimmedName, color });
    } else {
      createMutation.mutate({ name: trimmedName, color });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md bg-[#F7E6CA] border-[rgba(102,0,51,0.1)]"
        style={{ backgroundColor: '#F7E6CA' }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#660033]">
            {isEditing ? 'Edit Folder' : 'Create Folder'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Folder Name */}
          <div>
            <label
              htmlFor="folder-name"
              className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2"
            >
              Folder Name
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sony Music, Live Shows..."
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-[#660033] placeholder:text-[rgba(102,0,51,0.3)]"
              autoFocus
              disabled={isPending}
              data-testid="input-folder-name"
            />
          </div>

          {/* Color Picker - AC-7 */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-3">
              Folder Color (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === presetColor
                      ? 'ring-2 ring-offset-2 ring-[#660033] ring-offset-[#F7E6CA] scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  aria-label={`Select color ${presetColor}`}
                  data-testid={`color-${presetColor.replace('#', '')}`}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-[rgba(220,53,69,0.1)] border border-[rgba(220,53,69,0.2)] text-[#dc3545] text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm bg-[rgba(102,0,51,0.1)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
              disabled={isPending}
              data-testid="button-cancel-folder"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm bg-[#660033] text-[#F7E6CA] hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="button-save-folder"
            >
              {isPending && <Loader2 className="animate-spin" size={16} />}
              {isEditing ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
