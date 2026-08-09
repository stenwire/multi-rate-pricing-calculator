import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, documentsApi } from '../api/client';
import {
  DiscountKind,
  LineItemDraft,
  draftToInput,
  emptyDraft,
} from '../components/LineItemForm';

export default function CreateDocumentPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [rows, setRows] = useState<LineItemDraft[]>([{ ...emptyDraft }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = <K extends keyof LineItemDraft>(
    index: number,
    key: K,
    value: LineItemDraft[K],
  ) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const document = await documentsApi.create({
        title,
        customer,
        issueDate,
        // Rows the user left completely blank are dropped rather than rejected.
        lineItems: rows
          .filter(
            (row) => row.description.trim() !== '' || row.unitPrice !== '',
          )
          .map(draftToInput),
      });
      navigate(`/documents/${document.id}`, { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Unable to create the document.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Create document</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p
            role="alert"
            className="rounded bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="grid gap-4 rounded border border-slate-200 bg-white p-6 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Title</span>
            <input
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Customer</span>
            <input
              required
              maxLength={200}
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Issue date</span>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Line items</h2>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-7"
              >
                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block font-medium">Description</span>
                  <input
                    maxLength={300}
                    value={row.description}
                    onChange={(event) =>
                      updateRow(index, 'description', event.target.value)
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1.5"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium">Qty</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={row.quantity}
                    onChange={(event) =>
                      updateRow(index, 'quantity', event.target.value)
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1.5"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium">Unit price ($)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(event) =>
                      updateRow(index, 'unitPrice', event.target.value)
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1.5"
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-medium">Discount</span>
                  <select
                    value={row.discountKind}
                    onChange={(event) =>
                      updateRow(
                        index,
                        'discountKind',
                        event.target.value as DiscountKind,
                      )
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
                    {row.discountKind === 'fixed' ? 'Amount ($)' : 'Value (%)'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={row.discountKind === 'percent' ? 100 : undefined}
                    step={row.discountKind === 'fixed' ? '0.01' : '0.1'}
                    disabled={row.discountKind === 'none'}
                    value={row.discountValue}
                    onChange={(event) =>
                      updateRow(index, 'discountValue', event.target.value)
                    }
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
                    value={row.taxPercent}
                    onChange={(event) =>
                      updateRow(index, 'taxPercent', event.target.value)
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1.5"
                  />
                </label>

                <div className="md:col-span-7">
                  <button
                    type="button"
                    onClick={() =>
                      setRows((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    className="text-sm text-red-700 underline"
                  >
                    Remove line
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setRows((current) => [...current, { ...emptyDraft }])
            }
            className="mt-3 rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            Add line item
          </button>
        </section>

        <p className="text-sm text-slate-600">
          Totals are calculated by the server once the document is saved.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save as draft'}
        </button>
      </form>
    </div>
  );
}
