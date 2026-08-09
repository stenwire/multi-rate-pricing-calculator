import { ReportSummary as Summary } from '../api/client';
import DocumentTotals from './DocumentTotals';
import { formatDate } from '../utils/format';

export default function ReportSummary({ summary }: { summary: Summary }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">
          {formatDate(summary.startDate)} — {formatDate(summary.endDate)}
        </h2>
        <p className="text-sm text-muted">
          <span className="figure font-medium text-ink">
            {summary.documentCount}
          </span>{' '}
          finalized {summary.documentCount === 1 ? 'document' : 'documents'} in
          range
        </p>
      </div>

      {summary.documentCount === 0 ? (
        <div className="panel px-6 py-10 text-center">
          <p className="text-sm font-medium">Nothing finalized in this range</p>
          <p className="mt-1 text-sm text-muted">
            Drafts are never counted. Finalize a document, or widen the dates.
          </p>
        </div>
      ) : (
        <DocumentTotals
          subtotal={summary.subtotal}
          totalDiscount={summary.totalDiscount}
          totalTax={summary.totalTax}
          grandTotal={summary.grandTotal}
        />
      )}
    </section>
  );
}
