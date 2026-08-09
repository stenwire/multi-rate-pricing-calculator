import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentSummary, apiErrorMessage, documentsApi } from '../api/client';
import { formatDate, formatMoney } from '../utils/format';

type StatusFilter = 'all' | 'draft' | 'finalized';

export default function DocumentsListPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
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
    <div>
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-xl font-semibold">Documents</h1>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as StatusFilter)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
        </select>

        <Link
          to="/documents/new"
          className="ml-auto rounded bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Create document
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : documents.length === 0 ? (
        <p className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No documents yet. Create one to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Issue date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Grand total</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-t border-slate-200">
                  <td className="px-4 py-2 font-medium">{document.title}</td>
                  <td className="px-4 py-2">{document.customer}</td>
                  <td className="px-4 py-2">
                    {formatDate(document.issueDate)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        document.status === 'finalized'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {document.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(document.grandTotal)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/documents/${document.id}`}
                      className="underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
