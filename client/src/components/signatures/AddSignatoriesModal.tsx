import { useState } from 'react';
import { X, Plus, GripVertical, Trash2, Send, AlertCircle, Loader2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Contract } from '../../types';

interface Signatory {
  id: string;
  name: string;
  email: string;
}

interface Props {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

export function AddSignatoriesModal({ contract, isOpen, onClose, onSuccess }: Props) {
  const [signatories, setSignatories] = useState<Signatory[]>([
    { id: crypto.randomUUID(), name: '', email: '' },
  ]);
  const [message, setMessage] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSignatory = () => {
    if (signatories.length >= 10) return;
    setSignatories([
      ...signatories,
      { id: crypto.randomUUID(), name: '', email: '' },
    ]);
  };

  const removeSignatory = (id: string) => {
    if (signatories.length <= 1) return;
    setSignatories(signatories.filter(s => s.id !== id));
  };

  const updateSignatory = (id: string, field: 'name' | 'email', value: string) => {
    setSignatories(signatories.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(signatories);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    setSignatories(items);
  };

  const validateForm = (): string | null => {
    // Check all fields filled
    for (const s of signatories) {
      if (!s.name.trim()) return 'All signatories must have a name';
      if (!s.email.trim()) return 'All signatories must have an email';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) {
        return `Invalid email: ${s.email}`;
      }
    }

    // Check unique emails
    const emails = signatories.map(s => s.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      return 'Each signatory must have a unique email';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const response = await fetch('/api/signatures/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contractId: contract.id,
          signatories: signatories.map(s => ({
            name: s.name.trim(),
            email: s.email.trim().toLowerCase(),
          })),
          message: message.trim() || undefined,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create signature request');
      }

      onSuccess(data.signatureRequest.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    // Reset state on close
    setSignatories([{ id: crypto.randomUUID(), name: '', email: '' }]);
    setMessage('');
    setExpiresInDays(30);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[20px] shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(102,0,51,0.1)]">
          <div>
            <h2 className="text-lg font-bold text-[#660033]">Request Signatures</h2>
            <p className="text-sm text-[rgba(102,0,51,0.5)]">{contract.name}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-[rgba(102,0,51,0.05)] rounded-full transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-[#660033]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Signatories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block font-semibold text-[#660033]">
                Signatories
              </label>
              <span className="text-sm text-[rgba(102,0,51,0.5)]">
                {signatories.length}/10
              </span>
            </div>

            <p className="text-sm text-[rgba(102,0,51,0.6)] mb-3">
              Drag to reorder. Signers will be notified in this order.
            </p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="signatories">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {signatories.map((signatory, index) => (
                      <Draggable
                        key={signatory.id}
                        draggableId={signatory.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-2 p-3 bg-[rgba(102,0,51,0.03)] rounded-xl transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-5 w-5 text-[rgba(102,0,51,0.3)]" />
                            </div>

                            <div
                              className="flex items-center justify-center w-6 h-6 text-white rounded-full text-sm font-medium flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                            >
                              {index + 1}
                            </div>

                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={signatory.name}
                                onChange={(e) => updateSignatory(signatory.id, 'name', e.target.value)}
                                placeholder="Full Name"
                                className="px-3 py-2 border border-[rgba(102,0,51,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#660033] focus:border-transparent bg-white text-[#660033] placeholder:text-[rgba(102,0,51,0.4)]"
                              />
                              <input
                                type="email"
                                value={signatory.email}
                                onChange={(e) => updateSignatory(signatory.id, 'email', e.target.value)}
                                placeholder="Email"
                                className="px-3 py-2 border border-[rgba(102,0,51,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#660033] focus:border-transparent bg-white text-[#660033] placeholder:text-[rgba(102,0,51,0.4)]"
                              />
                            </div>

                            <button
                              onClick={() => removeSignatory(signatory.id)}
                              disabled={signatories.length <= 1}
                              className="p-2 hover:bg-[rgba(102,0,51,0.08)] rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-[rgba(102,0,51,0.5)]" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {signatories.length < 10 && (
              <button
                onClick={addSignatory}
                className="mt-3 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Signatory
              </button>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block font-semibold text-[#660033] mb-2">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to include in the signing request email..."
              rows={3}
              className="w-full px-3 py-2 border border-[rgba(102,0,51,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#660033] focus:border-transparent resize-none bg-white text-[#660033] placeholder:text-[rgba(102,0,51,0.4)]"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block font-semibold text-[#660033] mb-2">
              Expires In
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="px-3 py-2 border border-[rgba(102,0,51,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#660033] focus:border-transparent bg-white text-[#660033]"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-[rgba(102,0,51,0.1)] bg-[rgba(102,0,51,0.02)]">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-[rgba(102,0,51,0.6)] hover:text-[#660033] font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-semibold disabled:opacity-50 transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send for Signature
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
