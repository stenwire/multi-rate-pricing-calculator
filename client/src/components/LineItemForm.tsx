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
  /** Drops the panel framing when the form is already inside one, such as a dialog. */
  bare?: boolean;
}

export default function LineItemForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
  bare,
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
    <form onSubmit={handleSubmit} className={bare ? 'p-5' : 'panel p-4 sm:p-5'}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="field-label" htmlFor="li-description">
            Description
          </label>
          <input
            id="li-description"
            required
            maxLength={300}
            placeholder="Consulting, retainer, licence…"
            value={draft.description}
            onChange={(event) => set('description', event.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="li-quantity">
            Quantity
          </label>
          <input
            id="li-quantity"
            type="number"
            required
            min={1}
            step={1}
            value={draft.quantity}
            onChange={(event) => set('quantity', event.target.value)}
            className="field figure"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="li-unitPrice">
            Unit price ($)
          </label>
          <input
            id="li-unitPrice"
            type="number"
            required
            min={0}
            step="0.01"
            placeholder="0.00"
            value={draft.unitPrice}
            onChange={(event) => set('unitPrice', event.target.value)}
            className="field figure"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="li-discountKind">
            Discount
          </label>
          <select
            id="li-discountKind"
            value={draft.discountKind}
            onChange={(event) =>
              set('discountKind', event.target.value as DiscountKind)
            }
            className="field"
          >
            <option value="none">None</option>
            <option value="percent">Percent</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="li-discountValue">
            {draft.discountKind === 'fixed' ? 'Amount ($)' : 'Percent (%)'}
          </label>
          <input
            id="li-discountValue"
            type="number"
            min={0}
            max={draft.discountKind === 'percent' ? 100 : undefined}
            step={draft.discountKind === 'fixed' ? '0.01' : '0.1'}
            disabled={draft.discountKind === 'none'}
            required={draft.discountKind !== 'none'}
            value={draft.discountValue}
            onChange={(event) => set('discountValue', event.target.value)}
            className="field figure"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="li-taxPercent">
            Tax (%)
          </label>
          <input
            id="li-taxPercent"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={draft.taxPercent}
            onChange={(event) => set('taxPercent', event.target.value)}
            className="field figure"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 border-t border-rule pt-4 sm:flex-row sm:items-center">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-quiet">
            Cancel
          </button>
        )}
        <p className="text-xs text-muted sm:ml-auto">
          Enter prices in dollars.
        </p>
      </div>
    </form>
  );
}
