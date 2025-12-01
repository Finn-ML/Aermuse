import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Folder, FolderMinus, Loader2, FolderPlus } from 'lucide-react';
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

interface FoldersData {
  folders: FolderItem[];
  unfiledCount: number;
}

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractName: string;
  currentFolderId: string | null;
  onMoved: () => void;
}

/**
 * Modal for moving contracts between folders.
 * AC-4: Move contracts between folders
 */
export function MoveToFolderModal({
  isOpen,
  onClose,
  contractId,
  contractName,
  currentFolderId,
  onMoved,
}: MoveToFolderModalProps) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<FoldersData>({
    queryKey: ['/api/folders'],
    queryFn: async () => {
      const res = await fetch('/api/folders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch folders');
      return res.json();
    },
    enabled: isOpen,
  });

  const moveMutation = useMutation({
    mutationFn: async (folderId: string | null) => {
      const res = await apiRequest('POST', `/api/contracts/${contractId}/move`, { folderId });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to move contract');
      }
      return res.json();
    },
    onSuccess: (_, folderId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: folderId ? 'Contract moved' : 'Contract removed from folder',
      });
      onMoved();
      onClose();
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to move contract',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const handleMove = (folderId: string | null) => {
    moveMutation.mutate(folderId);
  };

  const folders = data?.folders ?? [];
  const availableFolders = folders.filter((f) => f.id !== currentFolderId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md bg-[#F7E6CA] border-[rgba(102,0,51,0.1)]"
        style={{ backgroundColor: '#F7E6CA' }}
      >
        <DialogHeader>
          <DialogTitle className="text-[#660033]">Move to Folder</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-[rgba(102,0,51,0.6)] mb-4">
            Move "<span className="font-medium text-[#660033]">{contractName}</span>" to:
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#660033]" size={24} />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Remove from folder option */}
              {currentFolderId && (
                <button
                  onClick={() => handleMove(null)}
                  disabled={moveMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(102,0,51,0.06)] text-left transition-colors disabled:opacity-50"
                  data-testid="move-to-unfiled"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(102,0,51,0.1)]">
                    <FolderMinus className="h-4 w-4 text-[#660033]" />
                  </div>
                  <div>
                    <span className="font-medium text-[#660033]">Remove from folder</span>
                    <p className="text-xs text-[rgba(102,0,51,0.5)]">Move to Unfiled</p>
                  </div>
                </button>
              )}

              {/* Folder list */}
              {availableFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMove(folder.id)}
                  disabled={moveMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(102,0,51,0.06)] text-left transition-colors disabled:opacity-50"
                  data-testid={`move-to-${folder.id}`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: folder.color || '#660033' }}
                  >
                    <Folder className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-[#660033]">{folder.name}</span>
                </button>
              ))}

              {/* Empty state */}
              {availableFolders.length === 0 && !currentFolderId && (
                <div className="text-center py-8">
                  <FolderPlus className="mx-auto h-10 w-10 text-[rgba(102,0,51,0.3)] mb-3" />
                  <p className="text-sm text-[rgba(102,0,51,0.6)] mb-1">No folders available</p>
                  <p className="text-xs text-[rgba(102,0,51,0.4)]">
                    Create a folder first to organize your contracts
                  </p>
                </div>
              )}

              {availableFolders.length === 0 && currentFolderId && (
                <p className="text-center py-4 text-sm text-[rgba(102,0,51,0.5)]">
                  No other folders available
                </p>
              )}
            </div>
          )}

          {/* Loading indicator */}
          {moveMutation.isPending && (
            <div className="flex items-center justify-center gap-2 pt-4 text-sm text-[rgba(102,0,51,0.6)]">
              <Loader2 className="animate-spin" size={16} />
              Moving contract...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
