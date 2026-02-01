import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2 } from 'lucide-react';

interface ProducerSplit {
  collaboratorName: string;
  collaboratorEmail: string;
  splitPercentage: number;
}

export interface ProducerAgreementData {
  agreement_date: string;
  licence_structure: 'recoup' | 'perpetual';
  licence_fee_amount: string;
  post_recoup_producer_split: number;
  post_recoup_artist_split: number;
  inactivity_period: string;
  licence_buyout_amount: string;
}

interface ProducerLicenseDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProducerAgreementData) => void;
  producerSplits: ProducerSplit[];
  trackTitle?: string;
  isSubmitting?: boolean;
}

const INACTIVITY_PERIOD_OPTIONS = [
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
  { value: '18', label: '18 months' },
  { value: '24', label: '24 months' },
];

function getDefaultDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function ProducerLicenseDialog({
  open,
  onClose,
  onSubmit,
  producerSplits,
  trackTitle,
  isSubmitting = false,
}: ProducerLicenseDialogProps) {
  const [formData, setFormData] = useState<ProducerAgreementData>({
    agreement_date: getDefaultDate(),
    licence_structure: 'perpetual',
    licence_fee_amount: '',
    post_recoup_producer_split: producerSplits[0]?.splitPercentage ?? 10,
    post_recoup_artist_split: 100 - (producerSplits[0]?.splitPercentage ?? 10),
    inactivity_period: '12',
    licence_buyout_amount: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProducerAgreementData, string>>>({});

  const updateField = <K extends keyof ProducerAgreementData>(
    field: K,
    value: ProducerAgreementData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProducerAgreementData, string>> = {};

    if (!formData.agreement_date) newErrors.agreement_date = 'Required';
    if (!formData.inactivity_period) newErrors.inactivity_period = 'Required';
    if (!formData.licence_buyout_amount.trim()) newErrors.licence_buyout_amount = 'Required';

    if (formData.licence_structure === 'recoup') {
      if (!formData.licence_fee_amount.trim()) newErrors.licence_fee_amount = 'Required';
      if (formData.post_recoup_producer_split < 0 || formData.post_recoup_producer_split > 100)
        newErrors.post_recoup_producer_split = 'Must be 0-100';
      if (formData.post_recoup_artist_split < 0 || formData.post_recoup_artist_split > 100)
        newErrors.post_recoup_artist_split = 'Must be 0-100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(formData);
  };

  const producerNames = producerSplits.map((p) => p.collaboratorName).join(', ');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Producer License & Monetisation Consent
          </DialogTitle>
          <DialogDescription>
            {trackTitle
              ? `Complete the license agreement for "${trackTitle}" with producer${producerSplits.length > 1 ? 's' : ''}: ${producerNames}.`
              : `Complete the license agreement with producer${producerSplits.length > 1 ? 's' : ''}: ${producerNames}.`}
            {' '}The contract will be sent for e-signing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-6 pb-4">
            {/* Producer Info (read-only) */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Producer{producerSplits.length > 1 ? 's' : ''}</p>
              {producerSplits.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {p.collaboratorName} ({p.collaboratorEmail}) &mdash; {p.splitPercentage}%
                </p>
              ))}
            </div>

            {/* Agreement Date */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Agreement Details
              </legend>

              <div className="space-y-2">
                <Label htmlFor="agreement_date">Agreement Date</Label>
                <Input
                  id="agreement_date"
                  type="date"
                  value={formData.agreement_date}
                  onChange={(e) => updateField('agreement_date', e.target.value)}
                />
                {errors.agreement_date && (
                  <p className="text-xs text-destructive">{errors.agreement_date}</p>
                )}
              </div>
            </fieldset>

            {/* Licence Structure */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Licence Structure
              </legend>

              <div className="space-y-2">
                <Label>Licence Payment Structure</Label>
                <Select
                  value={formData.licence_structure}
                  onValueChange={(v) => updateField('licence_structure', v as 'recoup' | 'perpetual')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perpetual">Perpetual Revenue Share via Aermuse</SelectItem>
                    <SelectItem value="recoup">Recoup-Until-Paid Licence</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.licence_structure === 'perpetual'
                    ? 'The revenue split applies perpetually to all Aermuse sales of the track.'
                    : 'A licence fee is recouped from the producer\'s share. After full recoupment, the split adjusts.'}
                </p>
              </div>

              {formData.licence_structure === 'recoup' && (
                <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="licence_fee_amount">Licence Fee Amount</Label>
                    <Input
                      id="licence_fee_amount"
                      type="text"
                      placeholder="e.g., 500"
                      value={formData.licence_fee_amount}
                      onChange={(e) => updateField('licence_fee_amount', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Amount to be recouped from producer's share of Aermuse sales
                    </p>
                    {errors.licence_fee_amount && (
                      <p className="text-xs text-destructive">{errors.licence_fee_amount}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="post_recoup_producer_split">Post-Recoup Producer Split (%)</Label>
                      <Input
                        id="post_recoup_producer_split"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.post_recoup_producer_split}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateField('post_recoup_producer_split', val);
                          updateField('post_recoup_artist_split', 100 - val);
                        }}
                      />
                      {errors.post_recoup_producer_split && (
                        <p className="text-xs text-destructive">{errors.post_recoup_producer_split}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="post_recoup_artist_split">Post-Recoup Artist Split (%)</Label>
                      <Input
                        id="post_recoup_artist_split"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.post_recoup_artist_split}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateField('post_recoup_artist_split', val);
                          updateField('post_recoup_producer_split', 100 - val);
                        }}
                      />
                      {errors.post_recoup_artist_split && (
                        <p className="text-xs text-destructive">{errors.post_recoup_artist_split}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After the licence fee is fully recouped, the revenue split adjusts to these percentages.
                  </p>
                </div>
              )}
            </fieldset>

            {/* Inactivity & Buyout */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Inactivity & Buyout
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inactivity_period">Inactivity Period</Label>
                  <Select
                    value={formData.inactivity_period}
                    onValueChange={(v) => updateField('inactivity_period', v)}
                  >
                    <SelectTrigger id="inactivity_period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INACTIVITY_PERIOD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    If no paid purchases in this period, artist must remove the track or buy out the licence.
                  </p>
                  {errors.inactivity_period && (
                    <p className="text-xs text-destructive">{errors.inactivity_period}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licence_buyout_amount">Licence Buyout Amount</Label>
                  <Input
                    id="licence_buyout_amount"
                    type="text"
                    placeholder="e.g., 1000"
                    value={formData.licence_buyout_amount}
                    onChange={(e) => updateField('licence_buyout_amount', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount for outright licence purchase if inactivity clause triggers
                  </p>
                  {errors.licence_buyout_amount && (
                    <p className="text-xs text-destructive">{errors.licence_buyout_amount}</p>
                  )}
                </div>
              </div>
            </fieldset>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit & Send for E-Signing'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
