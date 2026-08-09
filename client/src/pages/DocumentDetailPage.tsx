import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DocumentSummary,
  LineItem,
  LineItemInput,
  apiErrorMessage,
  documentsApi,
} from '../api/client';
import DocumentTotals from '../components/DocumentTotals';
import LineItemForm, { draftFromLineItem } from '../components/LineItemForm';
import LineItemsTable from '../components/LineItemsTable';
import { formatDate } from '../utils/format';

export default function DocumentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingLine, setEditingLine] = useState<LineItem | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [meta, setMeta] = useState({ title: '', customer: '', issueDate: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoc(await documentsApi.get(id));
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Unable to load the document.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Each mutation returns the recalculated document, so the view is refreshed from the
  // server's response rather than adjusted locally.
  const run = async (
    action: () => Promise<DocumentSummary>,
    failure: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      setDoc(await action());
      setEditingLine(null);
      setEditingMeta(false);
    } catch (caught) {
      setError(apiErrorMessage(caught, failure));
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = (input: LineItemInput) =>
    void run(
      () => documentsApi.addLineItem(id, input),
      'Unable to add the line item.',
    );

  const handleUpdate = (input: LineItemInput) => {
    if (!editingLine) {
      return;
    }
    void run(
      () => documentsApi.updateLineItem(id, editingLine.id, input),
      'Unable to update the line item.',
    );
  };

  const handleRemove = (line: LineItem) => {
    if (!window.confirm(`Remove "${line.description}"?`)) {
      return;
    }
    void run(
      () => documentsApi.removeLineItem(id, line.id),
      'Unable to remove the line item.',
    );
  };

  const handleFinalize = () => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) {
      return;
    }
    void run(
      () => documentsApi.finalize(id),
      'Unable to finalize the document.',
    );
  };

  const handleMetaSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () => documentsApi.update(id, meta),
      'Unable to update the document.',
    );
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft document?')) {
      return;
    }
    setBusy(true);
    try {
      await documentsApi.remove(id);
      navigate('/documents', { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Unable to delete the document.'));
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading...</p>;
  }

  if (!doc) {
    return (
      <p
        role="alert"
        className="rounded bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {error ?? 'Document not found.'}
      </p>
    );
  }

  const isDraft = doc.status === 'draft';

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div>
          <h1 className="text-xl font-semibold">{doc.title}</h1>
          <p className="text-sm text-slate-600">
            {doc.customer} · {formatDate(doc.issueDate)}
          </p>
        </div>

        <span
          className={`rounded px-2 py-1 text-xs ${
            isDraft
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {doc.status}
        </span>

        {isDraft && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMeta({
                  title: doc.title,
                  customer: doc.customer,
                  issueDate: doc.issueDate.slice(0, 10),
                });
                setEditingMeta((current) => !current);
              }}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              Edit document
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleFinalize}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Finalize
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {!isDraft && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          This document is finalized and can no longer be changed.
        </p>
      )}

      {isDraft && editingMeta && (
        <form
          onSubmit={handleMetaSubmit}
          className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-4"
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">Title</span>
            <input
              required
              maxLength={200}
              value={meta.title}
              onChange={(event) =>
                setMeta({ ...meta, title: event.target.value })
              }
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Customer</span>
            <input
              required
              maxLength={200}
              value={meta.customer}
              onChange={(event) =>
                setMeta({ ...meta, customer: event.target.value })
              }
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Issue date</span>
            <input
              type="date"
              required
              value={meta.issueDate}
              onChange={(event) =>
                setMeta({ ...meta, issueDate: event.target.value })
              }
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingMeta(false)}
              className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <LineItemsTable
        lineItems={doc.lineItems}
        editable={isDraft}
        busy={busy}
        onEdit={setEditingLine}
        onRemove={handleRemove}
      />

      <DocumentTotals
        subtotal={doc.subtotal}
        totalDiscount={doc.totalDiscount}
        totalTax={doc.totalTax}
        grandTotal={doc.grandTotal}
      />

      {isDraft && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            {editingLine
              ? `Edit "${editingLine.description}"`
              : 'Add line item'}
          </h2>
          <LineItemForm
            key={editingLine?.id ?? 'new'}
            initial={editingLine ? draftFromLineItem(editingLine) : undefined}
            submitLabel={editingLine ? 'Save line item' : 'Add line item'}
            busy={busy}
            onSubmit={editingLine ? handleUpdate : handleAdd}
            onCancel={editingLine ? () => setEditingLine(null) : undefined}
          />
        </section>
      )}
    </div>
  );
}
