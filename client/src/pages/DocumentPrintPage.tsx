import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DocumentSummary, apiErrorMessage, documentsApi } from '../api/client';
import { formatDate, formatMoney } from '../utils/format';

function describeDiscount(
  discount: DocumentSummary['lineItems'][number]['discount'],
): string {
  if (!discount) {
    return '—';
  }
  return discount.type === 'percent'
    ? `${discount.value}%`
    : formatMoney(discount.value);
}

// A preview of the printed document. What is on screen is what comes out of the printer, so
// the page renders the sheet itself and keeps its controls outside the printable area.
export default function DocumentPrintPage() {
  const { id = '' } = useParams();
  const [doc, setDoc] = useState<DocumentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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

  if (loading) {
    return (
      <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-lg bg-ledger" />
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

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to={`/documents/${doc.id}`}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          ← Back to document
        </Link>

        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-muted sm:block">
            Choose “Save as PDF” in the print dialog to download.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary"
          >
            Print or save as PDF
          </button>
        </div>
      </div>

      {/* The sheet. Fixed to a page-like width so the preview matches the printed result. */}
      <article className="print-sheet mx-auto w-full max-w-3xl bg-surface p-8 shadow-sm sm:p-12">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-rule pb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {doc.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {doc.status === 'finalized' ? 'Finalized' : 'Draft'} · Issued{' '}
              {formatDate(doc.issueDate)}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
              Billed to
            </p>
            <p className="mt-1 font-medium">{doc.customer}</p>
          </div>
        </header>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-[0.6875rem] tracking-wide text-muted uppercase">
              <th className="py-2 text-left font-semibold">Description</th>
              <th className="py-2 pl-3 text-right font-semibold">Qty</th>
              <th className="py-2 pl-3 text-right font-semibold">Unit price</th>
              <th className="py-2 pl-3 text-right font-semibold">Discount</th>
              <th className="py-2 pl-3 text-right font-semibold">Tax</th>
              <th className="py-2 pl-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.map((line) => (
              <tr key={line.id} className="border-b border-rule">
                <td className="py-2.5 pr-3">{line.description}</td>
                <td className="figure py-2.5 pl-3 text-right">
                  {line.quantity}
                </td>
                <td className="figure py-2.5 pl-3 text-right">
                  {formatMoney(line.unitPrice)}
                </td>
                <td className="figure py-2.5 pl-3 text-right">
                  {describeDiscount(line.discount)}
                </td>
                <td className="figure py-2.5 pl-3 text-right">
                  {line.taxPercent}%
                </td>
                <td className="figure py-2.5 pl-3 text-right font-medium">
                  {formatMoney(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs">
            <div className="flex justify-between py-1 text-sm">
              <dt className="text-muted">Subtotal</dt>
              <dd className="figure">{formatMoney(doc.subtotal)}</dd>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <dt className="text-muted">Discount</dt>
              <dd className="figure">
                {doc.totalDiscount > 0
                  ? `−${formatMoney(doc.totalDiscount)}`
                  : formatMoney(0)}
              </dd>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <dt className="text-muted">Tax</dt>
              <dd className="figure">{formatMoney(doc.totalTax)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-ink pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="figure text-lg font-semibold">
                {formatMoney(doc.grandTotal)}
              </dd>
            </div>
          </dl>
        </div>

        <p className="mt-10 border-t border-rule pt-4 text-xs text-muted">
          Each line is priced as its subtotal, less any discount, plus tax on
          the discounted amount.
        </p>
      </article>
    </div>
  );
}
