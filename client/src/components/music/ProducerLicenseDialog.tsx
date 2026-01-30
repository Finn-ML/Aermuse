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
  effectiveDate: string;
  territory: string;
  licenseType: string;
  duration: string;
  usageRights: string;
  masterOwnershipPercent: number;
  publishingPercent: number;
  royaltyRate: number;
  advance: string;
  producerCreditFormat: string;
  conditions: string;
  terminationConditions: string;
  noticePeriod: string;
}

interface ProducerLicenseDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProducerAgreementData) => void;
  producerSplits: ProducerSplit[];
  trackTitle?: string;
  isSubmitting?: boolean;
}

const TERRITORY_OPTIONS = [
  { value: 'worldwide', label: 'Worldwide' },
  { value: 'north_america', label: 'North America' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia_pacific', label: 'Asia Pacific' },
  { value: 'custom', label: 'Custom / Regional' },
];

const LICENSE_TYPE_OPTIONS = [
  { value: 'conditional', label: 'Conditional License' },
  { value: 'exclusive', label: 'Exclusive License' },
  { value: 'non_exclusive', label: 'Non-Exclusive License' },
];

const DURATION_OPTIONS = [
  { value: '1_year', label: '1 Year' },
  { value: '2_years', label: '2 Years' },
  { value: '3_years', label: '3 Years' },
  { value: '5_years', label: '5 Years' },
  { value: 'perpetual', label: 'Perpetual' },
];

const USAGE_RIGHTS_OPTIONS = [
  { value: 'streaming_only', label: 'Streaming Only' },
  { value: 'streaming_downloads', label: 'Streaming & Downloads' },
  { value: 'all_digital', label: 'All Digital Platforms' },
  { value: 'all_media', label: 'All Media (Digital + Physical)' },
  { value: 'sync_included', label: 'All Media + Sync Licensing' },
];

const NOTICE_PERIOD_OPTIONS = [
  { value: '30_days', label: '30 Days' },
  { value: '60_days', label: '60 Days' },
  { value: '90_days', label: '90 Days' },
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
    effectiveDate: getDefaultDate(),
    territory: 'worldwide',
    licenseType: 'conditional',
    duration: '1_year',
    usageRights: 'all_digital',
    masterOwnershipPercent: producerSplits[0]?.splitPercentage ?? 50,
    publishingPercent: 50,
    royaltyRate: 3,
    advance: '',
    producerCreditFormat: producerSplits.map((p) => `Prod. by ${p.collaboratorName}`).join(', '),
    conditions: 'License activates upon split verification and track release.',
    terminationConditions: 'Either party may terminate with written notice if material obligations are breached.',
    noticePeriod: '30_days',
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

    if (!formData.effectiveDate) newErrors.effectiveDate = 'Required';
    if (!formData.territory) newErrors.territory = 'Required';
    if (!formData.licenseType) newErrors.licenseType = 'Required';
    if (!formData.duration) newErrors.duration = 'Required';
    if (!formData.usageRights) newErrors.usageRights = 'Required';
    if (formData.masterOwnershipPercent < 0 || formData.masterOwnershipPercent > 100)
      newErrors.masterOwnershipPercent = 'Must be 0-100';
    if (formData.publishingPercent < 0 || formData.publishingPercent > 100)
      newErrors.publishingPercent = 'Must be 0-100';
    if (formData.royaltyRate < 0 || formData.royaltyRate > 50)
      newErrors.royaltyRate = 'Must be 0-50';
    if (!formData.producerCreditFormat.trim())
      newErrors.producerCreditFormat = 'Required';
    if (!formData.conditions.trim()) newErrors.conditions = 'Required';
    if (!formData.terminationConditions.trim())
      newErrors.terminationConditions = 'Required';
    if (!formData.noticePeriod) newErrors.noticePeriod = 'Required';

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
            Conditional License Agreement
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

            {/* Agreement Details */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Agreement Details
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => updateField('effectiveDate', e.target.value)}
                  />
                  {errors.effectiveDate && (
                    <p className="text-xs text-destructive">{errors.effectiveDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="territory">Territory</Label>
                  <Select
                    value={formData.territory}
                    onValueChange={(v) => updateField('territory', v)}
                  >
                    <SelectTrigger id="territory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERRITORY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.territory && (
                    <p className="text-xs text-destructive">{errors.territory}</p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* License Terms */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                License Terms
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseType">License Type</Label>
                  <Select
                    value={formData.licenseType}
                    onValueChange={(v) => updateField('licenseType', v)}
                  >
                    <SelectTrigger id="licenseType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.licenseType && (
                    <p className="text-xs text-destructive">{errors.licenseType}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(v) => updateField('duration', v)}
                  >
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.duration && (
                    <p className="text-xs text-destructive">{errors.duration}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usageRights">Usage Rights</Label>
                  <Select
                    value={formData.usageRights}
                    onValueChange={(v) => updateField('usageRights', v)}
                  >
                    <SelectTrigger id="usageRights">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USAGE_RIGHTS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.usageRights && (
                    <p className="text-xs text-destructive">{errors.usageRights}</p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Ownership & Royalties */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Ownership & Royalties
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="masterOwnershipPercent">Master Ownership (%)</Label>
                  <Input
                    id="masterOwnershipPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.masterOwnershipPercent}
                    onChange={(e) =>
                      updateField('masterOwnershipPercent', parseFloat(e.target.value) || 0)
                    }
                  />
                  {errors.masterOwnershipPercent && (
                    <p className="text-xs text-destructive">{errors.masterOwnershipPercent}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publishingPercent">Publishing (%)</Label>
                  <Input
                    id="publishingPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.publishingPercent}
                    onChange={(e) =>
                      updateField('publishingPercent', parseFloat(e.target.value) || 0)
                    }
                  />
                  {errors.publishingPercent && (
                    <p className="text-xs text-destructive">{errors.publishingPercent}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="royaltyRate">Royalty Rate (%)</Label>
                  <Input
                    id="royaltyRate"
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={formData.royaltyRate}
                    onChange={(e) =>
                      updateField('royaltyRate', parseFloat(e.target.value) || 0)
                    }
                  />
                  <p className="text-xs text-muted-foreground">Percentage of net master royalties</p>
                  {errors.royaltyRate && (
                    <p className="text-xs text-destructive">{errors.royaltyRate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advance">Advance (optional)</Label>
                  <Input
                    id="advance"
                    type="text"
                    placeholder="e.g., $500"
                    value={formData.advance}
                    onChange={(e) => updateField('advance', e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            {/* Credits */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Credits
              </legend>

              <div className="space-y-2">
                <Label htmlFor="producerCreditFormat">Producer Credit Format</Label>
                <Input
                  id="producerCreditFormat"
                  placeholder='e.g., "Prod. by Beat Master"'
                  value={formData.producerCreditFormat}
                  onChange={(e) => updateField('producerCreditFormat', e.target.value)}
                />
                {errors.producerCreditFormat && (
                  <p className="text-xs text-destructive">{errors.producerCreditFormat}</p>
                )}
              </div>
            </fieldset>

            {/* Conditions */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Conditions
              </legend>

              <div className="space-y-2">
                <Label htmlFor="conditions">Conditions for License Activation</Label>
                <textarea
                  id="conditions"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.conditions}
                  onChange={(e) => updateField('conditions', e.target.value)}
                />
                {errors.conditions && (
                  <p className="text-xs text-destructive">{errors.conditions}</p>
                )}
              </div>
            </fieldset>

            {/* Termination */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Termination
              </legend>

              <div className="space-y-2">
                <Label htmlFor="terminationConditions">Termination Conditions</Label>
                <textarea
                  id="terminationConditions"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.terminationConditions}
                  onChange={(e) => updateField('terminationConditions', e.target.value)}
                />
                {errors.terminationConditions && (
                  <p className="text-xs text-destructive">{errors.terminationConditions}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="noticePeriod">Notice Period</Label>
                <Select
                  value={formData.noticePeriod}
                  onValueChange={(v) => updateField('noticePeriod', v)}
                >
                  <SelectTrigger id="noticePeriod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTICE_PERIOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.noticePeriod && (
                  <p className="text-xs text-destructive">{errors.noticePeriod}</p>
                )}
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
