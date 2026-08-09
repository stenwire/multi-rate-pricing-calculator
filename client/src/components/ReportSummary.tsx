import { ReportSummary as Summary } from '../api/client';
import DocumentTotals from './DocumentTotals';
import { formatDate } from '../utils/format';

export default function ReportSummary({ summary }: { summary: Summary }) {
  if (summary.documentCount === 0) {
    return (
      <div className="panel px-6 py-12 text-center">
        <p className="text-sm font-medium">
          No finalized documents in this range
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Only finalized documents are included. Try a wider date range.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="panel divide-y divide-rule sm:divide-y-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 p-4 sm:p-5">
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
              Period
            </p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(summary.startDate)} – {formatDate(summary.endDate)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
              Documents
            </p>
            <p className="figure mt-1 text-sm font-medium">
              {summary.documentCount}
            </p>
          </div>
        </div>
      </div>

      <DocumentTotals
        subtotal={summary.subtotal}
        totalDiscount={summary.totalDiscount}
        totalTax={summary.totalTax}
        grandTotal={summary.grandTotal}
        label="Total invoiced"
        variant="report"
      />
    </section>
  );
}
