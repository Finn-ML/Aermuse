import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useState, useCallback, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Undo,
  Redo,
  Save,
  Loader2,
  Check,
} from 'lucide-react';

interface ContractEditorProps {
  contractId: string;
  initialContent: string;
  onSave?: (content: string) => Promise<void>;
  readOnly?: boolean;
}

export function ContractEditor({
  contractId,
  initialContent,
  onSave,
  readOnly = false,
}: ContractEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setHasChanges(true);
      setSaveError(null);
    },
  });

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasChanges || readOnly || !editor) return;

    const timeout = setTimeout(async () => {
      await handleSave();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [hasChanges, readOnly, editor]);

  const handleSave = useCallback(async () => {
    if (!editor || !hasChanges || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const content = editor.getHTML();

      if (onSave) {
        await onSave(content);
      } else {
        // Default save to API
        const response = await fetch(`/api/contracts/${contractId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ renderedContent: content }),
        });

        if (!response.ok) {
          throw new Error('Failed to save changes');
        }
      }

      setHasChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [editor, hasChanges, isSaving, contractId, onSave]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#660033]" />
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    disabled,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || readOnly}
      title={title}
      className={`p-2 rounded-lg transition-all ${
        isActive
          ? 'bg-[#660033] text-white'
          : 'text-[#660033] hover:bg-[rgba(102,0,51,0.1)]'
      } ${disabled || readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl overflow-hidden border border-[rgba(102,0,51,0.1)]">
      {/* Toolbar */}
      {!readOnly && (
        <div className="bg-[rgba(102,0,51,0.03)] border-b border-[rgba(102,0,51,0.1)] p-2 flex flex-wrap items-center gap-1">
          {/* History */}
          <div className="flex items-center gap-1 pr-2 border-r border-[rgba(102,0,51,0.1)]">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo size={18} />
            </ToolbarButton>
          </div>

          {/* Text formatting */}
          <div className="flex items-center gap-1 px-2 border-r border-[rgba(102,0,51,0.1)]">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <Bold size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <Italic size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline"
            >
              <UnderlineIcon size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive('highlight')}
              title="Highlight"
            >
              <Highlighter size={18} />
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 px-2 border-r border-[rgba(102,0,51,0.1)]">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={18} />
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 px-2 border-r border-[rgba(102,0,51,0.1)]">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered size={18} />
            </ToolbarButton>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 px-2">
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="Align Left"
            >
              <AlignLeft size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="Align Center"
            >
              <AlignCenter size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="Align Right"
            >
              <AlignRight size={18} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              isActive={editor.isActive({ textAlign: 'justify' })}
              title="Justify"
            >
              <AlignJustify size={18} />
            </ToolbarButton>
          </div>

          {/* Save button and status */}
          <div className="ml-auto flex items-center gap-3">
            {lastSaved && !hasChanges && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check size={14} />
                Saved
              </span>
            )}
            {saveError && (
              <span className="text-xs text-red-500">{saveError}</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                hasChanges
                  ? 'bg-[#660033] text-white hover:shadow-lg'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-6 min-h-[400px] focus:outline-none
          prose-headings:text-[#660033] prose-headings:font-bold
          prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
          prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
          prose-p:text-[rgba(102,0,51,0.8)] prose-p:leading-relaxed prose-p:my-3
          prose-strong:text-[#660033]
          prose-em:text-[rgba(102,0,51,0.7)]
          prose-ul:my-3 prose-ol:my-3
          prose-li:text-[rgba(102,0,51,0.8)]
          [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[350px]
          [&_.ProseMirror_mark]:bg-yellow-200"
      />

      {/* Read-only indicator */}
      {readOnly && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-center">
          <span className="text-sm text-gray-500">Read-only view</span>
        </div>
      )}
    </div>
  );
}
