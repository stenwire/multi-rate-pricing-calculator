import { FormEvent, useState } from 'react';
import { LineItem, LineItemInput } from '../api/client';

export type DiscountKind = 'none' | 'percent' | 'fixed';

export interface LineItemDraft {
  description: string;
  quantity: string;
  unitPrice: string;
  discountKind: DiscountKind;
  discountValue: string;
  taxPercent: string;
}

export const emptyDraft: LineItemDraft = {
  description: '',
  quantity: '1',
  unitPrice: '',
  discountKind: 'none',
  discountValue: '',
  taxPercent: '0',
};

export function draftFromLineItem(line: LineItem): LineItemDraft {
  return {
    description: line.description,
    quantity: String(line.quantity),
    unitPrice: (line.unitPrice / 100).toFixed(2),
    discountKind: line.discount ? line.discount.type : 'none',
    discountValue: line.discount
      ? line.discount.type === 'fixed'
        ? (line.discount.value / 100).toFixed(2)
        : String(line.discount.value)
      : '',
    taxPercent: String(line.taxPercent),
  };
}

// Dollars are converted to the smallest unit here and nowhere else (spec §12.4). A percent
// discount is a plain number, so only a fixed discount goes through the conversion.
export function draftToInput(draft: LineItemDraft): LineItemInput {
  const toCents = (value: string) => Math.round(parseFloat(value) * 100);

  return {
    description: draft.description.trim(),
    quantity: parseInt(draft.quantity, 10),
    unitPrice: toCents(draft.unitPrice),
    discount:
      draft.discountKind === 'none'
        ? null
        : {
            type: draft.discountKind,
            value:
              draft.discountKind === 'fixed'
                ? toCents(draft.discountValue)
                : parseFloat(draft.discountValue),
          },
    taxPercent: draft.taxPercent === '' ? 0 : parseFloat(draft.taxPercent),
  };
}

interface Props {
  initial?: LineItemDraft;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: LineItemInput) => void;
  onCancel?: () => void;
}

export default function LineItemForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<LineItemDraft>(initial ?? emptyDraft);

  const set = <K extends keyof LineItemDraft>(
    key: K,
    value: LineItemDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(draftToInput(draft));
    if (!initial) {
      setDraft(emptyDraft);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-6"
    >
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block font-medium">Description</span>
        <input
          required
          maxLength={300}
          value={draft.description}
          onChange={(event) => set('description', event.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1.5"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-medium">Qty</span>
        <input
          type="number"
          required
          min={1}
          step={1}
          value={draft.quantity}
          onChange={(event) => set('quantity', event.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1.5"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-medium">Unit price ($)</span>
        <input
          type="number"
          required
          min={0}
          step="0.01"
          value={draft.unitPrice}
          onChange={(event) => set('unitPrice', event.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1.5"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-medium">Discount</span>
        <select
          value={draft.discountKind}
          onChange={(event) =>
            set('discountKind', event.target.value as DiscountKind)
          }
          className="w-full rounded border border-slate-300 px-2 py-1.5"
        >
          <option value="none">None</option>
          <option value="percent">Percent</option>
          <option value="fixed">Fixed</option>
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-medium">
          {draft.discountKind === 'fixed' ? 'Amount ($)' : 'Value (%)'}
        </span>
        <input
          type="number"
          min={0}
          max={draft.discountKind === 'percent' ? 100 : undefined}
          step={draft.discountKind === 'fixed' ? '0.01' : '0.1'}
          disabled={draft.discountKind === 'none'}
          required={draft.discountKind !== 'none'}
          value={draft.discountValue}
          onChange={(event) => set('discountValue', event.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-medium">Tax (%)</span>
        <input
          type="number"
          min={0}
          max={100}
          step="0.1"
          value={draft.taxPercent}
          onChange={(event) => set('taxPercent', event.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1.5"
        />
      </label>

      <div className="flex items-end gap-2 md:col-span-6">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
