import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Minimal track type needed for this component
interface TrackLike {
  id: string;
  ownerSplitPercentage?: number | null;
}

// Minimal split type needed for this component
interface TrackSplitLike {
  id: string;
  collaboratorName: string;
  collaboratorEmail: string;
  collaboratorRole?: string | null;
  splitPercentage: number;
}

interface SplitEntry {
  id: string;
  collaboratorName: string;
  collaboratorEmail: string;
  collaboratorRole: string;
  splitPercentage: number;
}

interface SplitRegistrationFormProps {
  track: TrackLike;
  existingSplits?: TrackSplitLike[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

const COLLABORATOR_ROLES = [
  { value: 'artist', label: 'Artist' },
  { value: 'producer', label: 'Producer' },
  { value: 'writer', label: 'Writer' },
  { value: 'composer', label: 'Composer' },
  { value: 'performer', label: 'Performer' },
  { value: 'label', label: 'Label' },
  { value: 'other', label: 'Other' },
];

export function SplitRegistrationForm({
  track,
  existingSplits = [],
  onSuccess,
  onCancel,
}: SplitRegistrationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize with existing splits or empty
  const [splits, setSplits] = useState<SplitEntry[]>(() =>
    existingSplits.map((s) => ({
      id: s.id,
      collaboratorName: s.collaboratorName,
      collaboratorEmail: s.collaboratorEmail,
      collaboratorRole: s.collaboratorRole || 'artist',
      splitPercentage: s.splitPercentage,
    }))
  );

  const [ownerPercentage, setOwnerPercentage] = useState(() => {
    const totalCollaboratorPercentage = existingSplits.reduce(
      (sum, s) => sum + s.splitPercentage,
      0
    );
    return track.ownerSplitPercentage ?? (100 - totalCollaboratorPercentage);
  });

  const totalPercentage =
    ownerPercentage + splits.reduce((sum, s) => sum + (s.splitPercentage || 0), 0);

  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;

  const saveSplitsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tracks/${track.id}/splits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          splits: splits.map((s) => ({
            collaboratorName: s.collaboratorName,
            collaboratorEmail: s.collaboratorEmail,
            collaboratorRole: s.collaboratorRole,
            splitPercentage: s.splitPercentage,
          })),
          ownerSplitPercentage: ownerPercentage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save splits');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Splits saved',
        description:
          'Verification emails have been sent to all collaborators.',
      });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['track-splits', track.id] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addSplit = () => {
    setSplits([
      ...splits,
      {
        id: crypto.randomUUID(),
        collaboratorName: '',
        collaboratorEmail: '',
        collaboratorRole: 'artist',
        splitPercentage: 0,
      },
    ]);
  };

  const removeSplit = (id: string) => {
    setSplits(splits.filter((s) => s.id !== id));
  };

  const updateSplit = (id: string, field: keyof SplitEntry, value: string | number) => {
    setSplits(
      splits.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidTotal) {
      toast({
        title: 'Invalid percentages',
        description: 'Split percentages must add up to exactly 100%',
        variant: 'destructive',
      });
      return;
    }

    // Validate all splits have required fields
    for (const split of splits) {
      if (!split.collaboratorName.trim()) {
        toast({
          title: 'Missing name',
          description: 'Please enter a name for all collaborators',
          variant: 'destructive',
        });
        return;
      }
      if (!split.collaboratorEmail.trim() || !split.collaboratorEmail.includes('@')) {
        toast({
          title: 'Invalid email',
          description: 'Please enter a valid email for all collaborators',
          variant: 'destructive',
        });
        return;
      }
      if (split.splitPercentage <= 0) {
        toast({
          title: 'Invalid percentage',
          description: 'All collaborators must have a percentage greater than 0',
          variant: 'destructive',
        });
        return;
      }
    }

    saveSplitsMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Owner's Split */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-base font-semibold">Your Split (as uploader)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={ownerPercentage}
              onChange={(e) => setOwnerPercentage(parseFloat(e.target.value) || 0)}
              className="w-24 text-right"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          This is your share of the royalties as the track uploader.
        </p>
      </div>

      {/* Collaborator Splits */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Collaborators</Label>
          <Button type="button" variant="outline" size="sm" onClick={addSplit}>
            <Plus className="h-4 w-4 mr-1" />
            Add Collaborator
          </Button>
        </div>

        {splits.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <UserPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              No collaborators added yet
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={addSplit}>
              Add Collaborator
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {splits.map((split, index) => (
              <div
                key={split.id}
                className="p-4 border rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Collaborator {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSplit(split.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${split.id}`}>Name</Label>
                    <Input
                      id={`name-${split.id}`}
                      placeholder="Collaborator name"
                      value={split.collaboratorName}
                      onChange={(e) =>
                        updateSplit(split.id, 'collaboratorName', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`email-${split.id}`}>Email</Label>
                    <Input
                      id={`email-${split.id}`}
                      type="email"
                      placeholder="collaborator@email.com"
                      value={split.collaboratorEmail}
                      onChange={(e) =>
                        updateSplit(split.id, 'collaboratorEmail', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`role-${split.id}`}>Role</Label>
                    <Select
                      value={split.collaboratorRole}
                      onValueChange={(value) =>
                        updateSplit(split.id, 'collaboratorRole', value)
                      }
                    >
                      <SelectTrigger id={`role-${split.id}`}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLABORATOR_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`percentage-${split.id}`}>Split %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`percentage-${split.id}`}
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={split.splitPercentage}
                        onChange={(e) =>
                          updateSplit(
                            split.id,
                            'splitPercentage',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Summary */}
      <div
        className={`p-4 rounded-lg flex items-center justify-between ${
          isValidTotal
            ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900'
            : 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900'
        }`}
      >
        <div className="flex items-center gap-2">
          {!isValidTotal && <AlertCircle className="h-5 w-5 text-red-500" />}
          <span className="font-medium">Total:</span>
        </div>
        <span
          className={`text-xl font-bold ${
            isValidTotal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {totalPercentage.toFixed(1)}%
        </span>
      </div>

      {!isValidTotal && (
        <p className="text-sm text-red-500">
          Percentages must add up to exactly 100%. Currently {totalPercentage > 100 ? 'over' : 'under'} by{' '}
          {Math.abs(100 - totalPercentage).toFixed(1)}%.
        </p>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>How it works:</strong> Each collaborator will receive an email to verify
          their split. They have 2 weeks to accept. Once all collaborators verify (or the
          deadline passes), you can publish your track.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saveSplitsMutation.isPending || !isValidTotal}
        >
          {saveSplitsMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Send Verification Emails'
          )}
        </Button>
      </div>
    </form>
  );
}
