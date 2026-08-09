import { ReportSummary as Summary } from '../api/client';
import { formatMoney } from '../utils/format';

export default function ReportSummary({ summary }: { summary: Summary }) {
  const rows = [
    { label: 'Documents in range', value: String(summary.documentCount) },
    { label: 'Subtotal', value: formatMoney(summary.subtotal) },
    { label: 'Total discount', value: formatMoney(summary.totalDiscount) },
    { label: 'Total tax', value: formatMoney(summary.totalTax) },
    { label: 'Grand total', value: formatMoney(summary.grandTotal) },
  ];

  return (
    <div className="rounded border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">
        {summary.startDate} to {summary.endDate}
      </h2>
      <p className="mb-4 text-sm text-slate-600">Finalized documents only.</p>

      <dl className="divide-y divide-slate-200 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between py-2">
            <dt className="text-slate-600">{row.label}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
