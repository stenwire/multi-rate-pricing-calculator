import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentSummary, apiErrorMessage, documentsApi } from '../api/client';
import { formatDate, formatMoney } from '../utils/format';

type StatusFilter = 'all' | 'draft' | 'finalized';

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'finalized', label: 'Finalized' },
];

function StatusPill({ status }: { status: DocumentSummary['status'] }) {
  return (
    <span
      className={`pill ${status === 'finalized' ? 'pill-sealed' : 'pill-draft'}`}
    >
      {status === 'finalized' ? 'Finalized' : 'Draft'}
    </span>
  );
}

export default function DocumentsListPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await documentsApi.list(
        filter === 'all' ? {} : { status: filter },
      );
      setDocuments(result.documents);
      setTotal(result.pagination.total);
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Unable to load documents.'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? 'Loading…'
              : `${total} ${total === 1 ? 'document' : 'documents'}`}
          </p>
        </div>
        <Link to="/documents/new" className="btn btn-primary">
          New document
        </Link>
      </header>

      <div
        role="tablist"
        aria-label="Filter by status"
        className="inline-flex rounded-lg border border-rule bg-surface p-1"
      >
        {filters.map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-ink text-white'
                : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-flag/20 bg-flag-soft px-4 py-3 text-sm text-flag"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="panel space-y-3 p-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded bg-ledger" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <p className="text-sm font-medium">
            {filter === 'all' ? 'No documents yet' : `No ${filter} documents`}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Create a document, add line items with their own discount and tax,
            and the server prices every one.
          </p>
          <Link
            to="/documents/new"
            className="btn btn-primary mt-5 inline-flex"
          >
            New document
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="panel hidden overflow-hidden md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-rule text-[0.6875rem] tracking-wide text-muted uppercase">
                  <th className="px-4 py-2.5 text-left font-semibold">Title</th>
                  <th className="px-4 py-2.5 text-left font-semibold">
                    Customer
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold">
                    Issued
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Grand total
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr
                    key={document.id}
                    className="border-b border-rule last:border-0 hover:bg-paper"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to={`/documents/${document.id}`}
                        className="hover:text-accrual"
                      >
                        {document.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {document.customer}
                    </td>
                    <td className="figure px-4 py-3 text-muted">
                      {formatDate(document.issueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={document.status} />
                    </td>
                    <td className="figure px-4 py-3 text-right font-semibold">
                      {formatMoney(document.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/documents/${document.id}`}
                        className="text-sm font-medium text-accrual hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {documents.map((document) => (
              <li key={document.id}>
                <Link
                  to={`/documents/${document.id}`}
                  className="panel block p-4 transition-colors hover:bg-paper"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words">
                        {document.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {document.customer}
                      </p>
                    </div>
                    <StatusPill status={document.status} />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between border-t border-rule pt-3">
                    <span className="figure text-xs text-muted">
                      {formatDate(document.issueDate)}
                    </span>
                    <span className="figure text-base font-semibold">
                      {formatMoney(document.grandTotal)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
