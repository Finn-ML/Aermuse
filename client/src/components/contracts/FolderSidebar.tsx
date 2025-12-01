import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDroppable } from '@dnd-kit/core';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Folder, FolderPlus, MoreVertical, Pencil, Trash2, FileText, AlertCircle } from 'lucide-react';
import { CreateFolderModal } from './CreateFolderModal';
import { useToast } from '@/hooks/use-toast';

interface FolderItem {
  id: string;
  name: string;
  color: string | null;
  contractCount: number;
}

interface FoldersData {
  folders: FolderItem[];
  unfiledCount: number;
}

interface FolderSidebarProps {
  selectedFolder: string | null; // null = all, 'unfiled' = unfiled, string = folder id
  onSelectFolder: (folderId: string | null) => void;
}

/**
 * Folder sidebar for contract organization.
 * AC-5: Folder list in sidebar
 * AC-6: "All Contracts" and "Unfiled" sections
 * AC-8: Contract count per folder
 */
export function FolderSidebar({ selectedFolder, onSelectFolder }: FolderSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<FoldersData>({
    queryKey: ['/api/folders'],
    queryFn: async () => {
      const res = await fetch('/api/folders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch folders');
      return res.json();
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await apiRequest('DELETE', `/api/folders/${folderId}`, {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete folder');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({ title: 'Folder deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cannot delete folder',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleDelete = async (folder: FolderItem) => {
    // AC-3: Delete empty folders only
    if (folder.contractCount > 0) {
      toast({
        title: 'Cannot delete folder',
        description: 'Move or delete all contracts in this folder first.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Delete folder "${folder.name}"?`)) return;

    deleteFolderMutation.mutate(folder.id);
    if (selectedFolder === folder.id) {
      onSelectFolder(null);
    }
  };

  const folders = data?.folders ?? [];
  const unfiledCount = data?.unfiledCount ?? 0;
  const totalCount = folders.reduce((sum, f) => sum + f.contractCount, 0) + unfiledCount;

  return (
    <div
      className="w-64 flex-shrink-0 h-full overflow-y-auto"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRight: '1px solid rgba(102, 0, 51, 0.08)',
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#660033]">Folders</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 hover:bg-[rgba(102,0,51,0.06)] rounded-lg transition-colors"
            aria-label="Create folder"
            data-testid="button-create-folder"
          >
            <FolderPlus className="h-5 w-5 text-[#660033]" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-[rgba(102,0,51,0.5)]">
            Loading folders...
          </div>
        ) : (
          <>
            {/* All Contracts */}
            <button
              onClick={() => onSelectFolder(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors ${
                selectedFolder === null
                  ? 'bg-[#660033] text-[#F7E6CA]'
                  : 'hover:bg-[rgba(102,0,51,0.06)] text-[#660033]'
              }`}
              data-testid="folder-all-contracts"
            >
              <FileText className="h-5 w-5" />
              <span className="flex-1 text-left font-medium">All Contracts</span>
              <span className={`text-sm ${selectedFolder === null ? 'text-[#F7E6CA]/70' : 'text-[rgba(102,0,51,0.5)]'}`}>
                {totalCount}
              </span>
            </button>

            {/* Unfiled - Droppable */}
            <DroppableFolder
              id="unfiled"
              isSelected={selectedFolder === 'unfiled'}
              onSelect={() => onSelectFolder('unfiled')}
              icon={<Folder className="h-5 w-5" />}
              label="Unfiled"
              count={unfiledCount}
              className="mb-3"
            />

            <hr className="my-3 border-[rgba(102,0,51,0.08)]" />

            {/* Custom Folders */}
            <div className="space-y-1">
              {folders.map((folder) => (
                <FolderItemRow
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolder === folder.id}
                  onSelect={() => onSelectFolder(folder.id)}
                  onEdit={() => setEditingFolder(folder)}
                  onDelete={() => handleDelete(folder)}
                />
              ))}
            </div>

            {folders.length === 0 && (
              <p className="text-sm text-[rgba(102,0,51,0.5)] text-center py-4">
                No folders yet
              </p>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      <CreateFolderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
          setShowCreateModal(false);
        }}
      />

      {/* Edit Modal - AC-2: Rename folders */}
      {editingFolder && (
        <CreateFolderModal
          isOpen={true}
          onClose={() => setEditingFolder(null)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
            setEditingFolder(null);
          }}
          folder={editingFolder}
        />
      )}
    </div>
  );
}

// Generic droppable folder component
interface DroppableFolderProps {
  id: string;
  isSelected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  className?: string;
}

function DroppableFolder({ id, isSelected, onSelect, icon, label, count, className = '' }: DroppableFolderProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${className} ${
        isOver
          ? 'bg-[rgba(102,0,51,0.15)] ring-2 ring-[#660033] ring-offset-1'
          : isSelected
            ? 'bg-[#660033] text-[#F7E6CA]'
            : 'hover:bg-[rgba(102,0,51,0.06)] text-[#660033]'
      }`}
      data-testid={`folder-${id}`}
    >
      {icon}
      <span className="flex-1 text-left font-medium">{label}</span>
      <span className={`text-sm ${isSelected ? 'text-[#F7E6CA]/70' : 'text-[rgba(102,0,51,0.5)]'}`}>
        {count}
      </span>
    </button>
  );
}

interface FolderItemRowProps {
  folder: FolderItem;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function FolderItemRow({ folder, isSelected, onSelect, onEdit, onDelete }: FolderItemRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { isOver, setNodeRef } = useDroppable({ id: folder.id });

  return (
    <div className="relative group" ref={setNodeRef}>
      <button
        onClick={onSelect}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
          isOver
            ? 'bg-[rgba(102,0,51,0.15)] ring-2 ring-[#660033] ring-offset-1'
            : isSelected
              ? 'bg-[#660033] text-[#F7E6CA]'
              : 'hover:bg-[rgba(102,0,51,0.06)] text-[#660033]'
        }`}
        data-testid={`folder-${folder.id}`}
      >
        {/* AC-7: Folder color labels */}
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: folder.color || '#660033' }}
        >
          <Folder className="h-3 w-3 text-white" />
        </div>
        <span className="flex-1 text-left font-medium truncate">{folder.name}</span>
        <span className={`text-sm ${isSelected ? 'text-[#F7E6CA]/70' : 'text-[rgba(102,0,51,0.5)]'}`}>
          {folder.contractCount}
        </span>
      </button>

      {/* Menu Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 rounded transition-all ${
          isSelected
            ? 'hover:bg-[rgba(247,230,202,0.2)]'
            : 'hover:bg-[rgba(102,0,51,0.1)]'
        }`}
        data-testid={`folder-menu-${folder.id}`}
      >
        <MoreVertical className={`h-4 w-4 ${isSelected ? 'text-[#F7E6CA]' : 'text-[rgba(102,0,51,0.5)]'}`} />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-[rgba(102,0,51,0.1)] py-1 z-20">
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#660033] hover:bg-[rgba(102,0,51,0.06)] transition-colors"
              data-testid={`folder-rename-${folder.id}`}
            >
              <Pencil className="h-4 w-4" />
              Rename
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#dc3545] hover:bg-[rgba(220,53,69,0.06)] transition-colors"
              data-testid={`folder-delete-${folder.id}`}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
