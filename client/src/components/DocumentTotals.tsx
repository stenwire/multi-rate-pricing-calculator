import { formatMoney } from '../utils/format';

interface Props {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

export default function DocumentTotals({
  subtotal,
  totalDiscount,
  totalTax,
  grandTotal,
}: Props) {
  const rows = [
    { label: 'Subtotal', value: subtotal },
    { label: 'Total discount', value: totalDiscount },
    { label: 'Total tax', value: totalTax },
  ];

  return (
    <div className="ml-auto w-full max-w-xs rounded border border-slate-200 bg-white p-4 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between py-1">
          <span className="text-slate-600">{row.label}</span>
          <span>{formatMoney(row.value)}</span>
        </div>
      ))}
      <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
        <span>Grand total</span>
        <span>{formatMoney(grandTotal)}</span>
      </div>
    </div>
  );
}
