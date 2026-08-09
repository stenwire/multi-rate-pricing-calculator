import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="space-y-6">
      <Link
        to="/documents"
        className="text-sm font-medium text-muted hover:text-ink"
      >
        ← Documents
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New document</h1>
        <p className="mt-1 text-sm text-muted">
          Saved as a draft. You can keep editing it until you finalize.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-flag/20 bg-flag-soft px-4 py-3 text-sm text-flag"
          >
            {error}
          </p>
        )}

        <div className="panel grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
          <div>
            <label className="field-label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              required
              maxLength={200}
              placeholder="Q1 Services"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="customer">
              Customer
            </label>
            <input
              id="customer"
              required
              maxLength={200}
              placeholder="Acme Corp"
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="issueDate">
              Issue date
            </label>
            <input
              id="issueDate"
              type="date"
              required
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
              className="field figure"
            />
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-[0.06em] text-muted uppercase">
              Line items
            </h2>
            <span className="figure text-xs text-muted">
              {rows.length} {rows.length === 1 ? 'row' : 'rows'}
            </span>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={index} className="panel p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="lg:col-span-2">
                    <label className="field-label" htmlFor={`desc-${index}`}>
                      Description
                    </label>
                    <input
                      id={`desc-${index}`}
                      maxLength={300}
                      placeholder="Consulting, retainer, licence…"
                      value={row.description}
                      onChange={(event) =>
                        updateRow(index, 'description', event.target.value)
                      }
                      className="field"
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`qty-${index}`}>
                      Quantity
                    </label>
                    <input
                      id={`qty-${index}`}
                      type="number"
                      min={1}
                      step={1}
                      value={row.quantity}
                      onChange={(event) =>
                        updateRow(index, 'quantity', event.target.value)
                      }
                      className="field figure"
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`price-${index}`}>
                      Unit price ($)
                    </label>
                    <input
                      id={`price-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={row.unitPrice}
                      onChange={(event) =>
                        updateRow(index, 'unitPrice', event.target.value)
                      }
                      className="field figure"
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`dtype-${index}`}>
                      Discount
                    </label>
                    <select
                      id={`dtype-${index}`}
                      value={row.discountKind}
                      onChange={(event) =>
                        updateRow(
                          index,
                          'discountKind',
                          event.target.value as DiscountKind,
                        )
                      }
                      className="field"
                    >
                      <option value="none">None</option>
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`dval-${index}`}>
                      {row.discountKind === 'fixed'
                        ? 'Amount ($)'
                        : 'Percent (%)'}
                    </label>
                    <input
                      id={`dval-${index}`}
                      type="number"
                      min={0}
                      max={row.discountKind === 'percent' ? 100 : undefined}
                      step={row.discountKind === 'fixed' ? '0.01' : '0.1'}
                      disabled={row.discountKind === 'none'}
                      value={row.discountValue}
                      onChange={(event) =>
                        updateRow(index, 'discountValue', event.target.value)
                      }
                      className="field figure"
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor={`tax-${index}`}>
                      Tax (%)
                    </label>
                    <input
                      id={`tax-${index}`}
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={row.taxPercent}
                      onChange={(event) =>
                        updateRow(index, 'taxPercent', event.target.value)
                      }
                      className="field figure"
                    />
                  </div>
                </div>

                {rows.length > 1 && (
                  <div className="mt-3 border-t border-rule pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setRows((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      className="text-sm font-medium text-flag hover:underline"
                    >
                      Remove row
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setRows((current) => [...current, { ...emptyDraft }])
            }
            className="btn btn-quiet w-full sm:w-auto"
          >
            + Add another line
          </button>
        </section>

        <div className="panel flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? 'Saving…' : 'Save as draft'}
          </button>
          <Link to="/documents" className="btn btn-quiet">
            Cancel
          </Link>
          <p className="text-xs text-muted sm:ml-auto">
            Totals are calculated when you save.
          </p>
        </div>
      </form>
    </div>
  );
}
