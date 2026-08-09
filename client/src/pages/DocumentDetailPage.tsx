import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  DocumentSummary,
  LineItem,
  LineItemInput,
  apiErrorMessage,
  documentsApi,
} from '../api/client';
import ConfirmDialog, { ConfirmRequest } from '../components/ConfirmDialog';
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
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(
    null,
  );

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
      setConfirmRequest(null);
    } catch (caught) {
      setError(apiErrorMessage(caught, failure));
      setConfirmRequest(null);
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

  const askRemoveLine = (line: LineItem) =>
    setConfirmRequest({
      title: 'Remove this line item?',
      body: `"${line.description}" will be removed and the document totals recalculated.`,
      confirmLabel: 'Remove line item',
      tone: 'danger',
      onConfirm: () =>
        void run(
          () => documentsApi.removeLineItem(id, line.id),
          'Unable to remove the line item.',
        ),
    });

  const askFinalize = () =>
    setConfirmRequest({
      title: 'Finalize this document?',
      body: 'Once finalized, this document can no longer be edited and cannot be returned to draft.',
      confirmLabel: 'Finalize',
      onConfirm: () =>
        void run(
          () => documentsApi.finalize(id),
          'Unable to finalize the document.',
        ),
    });

  const askDelete = () =>
    setConfirmRequest({
      title: 'Delete this draft?',
      body: 'The document and all of its line items will be deleted. This cannot be undone.',
      confirmLabel: 'Delete document',
      tone: 'danger',
      onConfirm: async () => {
        setBusy(true);
        try {
          await documentsApi.remove(id);
          navigate('/documents', { replace: true });
        } catch (caught) {
          setError(apiErrorMessage(caught, 'Unable to delete the document.'));
          setConfirmRequest(null);
          setBusy(false);
        }
      },
    });

  // Duplicating reuses the ordinary create endpoint rather than adding one: the copy is just
  // a new draft built from this document's inputs, and the server prices it from scratch.
  const handleDuplicate = async () => {
    if (!doc) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const copy = await documentsApi.create({
        title: `${doc.title} (copy)`.slice(0, 200),
        customer: doc.customer,
        issueDate: doc.issueDate.slice(0, 10),
        lineItems: doc.lineItems.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          taxPercent: line.taxPercent,
        })),
      });
      navigate(`/documents/${copy.id}`);
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Unable to duplicate the document.'));
    } finally {
      setBusy(false);
    }
  };

  const handleMetaSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () => documentsApi.update(id, meta),
      'Unable to update the document.',
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-ledger" />
        <div className="h-24 animate-pulse rounded-lg bg-ledger" />
        <div className="h-48 animate-pulse rounded-lg bg-ledger" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="panel px-6 py-14 text-center">
        <p className="text-sm font-medium">{error ?? 'Document not found.'}</p>
        <Link to="/documents" className="btn btn-quiet mt-5 inline-flex">
          Back to documents
        </Link>
      </div>
    );
  }

  const isDraft = doc.status === 'draft';

  return (
    <div className="space-y-6">
      <Link
        to="/documents"
        className="text-sm font-medium text-muted hover:text-ink print:hidden"
      >
        ← Documents
      </Link>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-flag/20 bg-flag-soft px-4 py-3 text-sm text-flag"
        >
          {error}
        </p>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {doc.title}
            </h1>
            <span className={`pill ${isDraft ? 'pill-draft' : 'pill-sealed'}`}>
              {isDraft ? 'Draft' : 'Finalized'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {doc.customer} · {formatDate(doc.issueDate)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-quiet"
          >
            Print
          </button>

          {!isDraft && (
            <button
              type="button"
              disabled={busy}
              onClick={handleDuplicate}
              className="btn btn-quiet"
            >
              Duplicate as draft
            </button>
          )}

          {isDraft && (
            <>
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
                className="btn btn-quiet"
              >
                Edit details
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={askDelete}
                className="btn btn-danger"
              >
                Delete
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={askFinalize}
                className="btn btn-primary"
              >
                Finalize
              </button>
            </>
          )}
        </div>
      </header>

      {!isDraft && (
        <p className="rounded-lg border border-seal/20 bg-seal-soft px-4 py-3 text-sm text-seal">
          Finalized on {formatDate(doc.updatedAt)}. Finalized documents can no
          longer be edited.
        </p>
      )}

      {isDraft && editingMeta && (
        <form onSubmit={handleMetaSubmit} className="panel p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="field-label" htmlFor="meta-title">
                Title
              </label>
              <input
                id="meta-title"
                required
                maxLength={200}
                value={meta.title}
                onChange={(event) =>
                  setMeta({ ...meta, title: event.target.value })
                }
                className="field"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="meta-customer">
                Customer
              </label>
              <input
                id="meta-customer"
                required
                maxLength={200}
                value={meta.customer}
                onChange={(event) =>
                  setMeta({ ...meta, customer: event.target.value })
                }
                className="field"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="meta-issueDate">
                Issue date
              </label>
              <input
                id="meta-issueDate"
                type="date"
                required
                value={meta.issueDate}
                onChange={(event) =>
                  setMeta({ ...meta, issueDate: event.target.value })
                }
                className="field figure"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-rule pt-4 sm:flex-row">
            <button type="submit" disabled={busy} className="btn btn-primary">
              Save details
            </button>
            <button
              type="button"
              onClick={() => setEditingMeta(false)}
              className="btn btn-quiet"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.06em] text-muted uppercase">
          Line items
        </h2>
        <LineItemsTable
          lineItems={doc.lineItems}
          editable={isDraft}
          busy={busy}
          onEdit={setEditingLine}
          onRemove={askRemoveLine}
        />
      </section>

      <DocumentTotals
        subtotal={doc.subtotal}
        totalDiscount={doc.totalDiscount}
        totalTax={doc.totalTax}
        grandTotal={doc.grandTotal}
      />

      {isDraft && (
        <section className="space-y-3 print:hidden">
          <h2 className="text-sm font-semibold tracking-[0.06em] text-muted uppercase">
            {editingLine
              ? `Editing "${editingLine.description}"`
              : 'Add a line item'}
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

      <ConfirmDialog
        request={confirmRequest}
        busy={busy}
        onDismiss={() => setConfirmRequest(null)}
      />
    </div>
  );
}
