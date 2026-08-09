import { LineItem } from '../api/client';
import { formatMoney } from '../utils/format';

function describeDiscount(line: LineItem): string {
  if (!line.discount) {
    return '—';
  }
  return line.discount.type === 'percent'
    ? `${line.discount.value}%`
    : formatMoney(line.discount.value);
}

interface Props {
  lineItems: LineItem[];
  editable: boolean;
  busy?: boolean;
  onEdit?: (line: LineItem) => void;
  onRemove?: (line: LineItem) => void;
}

// Every monetary column is rendered from the server's response; nothing here is recalculated.
export default function LineItemsTable({
  lineItems,
  editable,
  busy,
  onEdit,
  onRemove,
}: Props) {
  if (lineItems.length === 0) {
    return (
      <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No line items yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Unit price</th>
            <th className="px-3 py-2 text-right">Discount</th>
            <th className="px-3 py-2 text-right">Tax %</th>
            <th className="px-3 py-2 text-right">Subtotal</th>
            <th className="px-3 py-2 text-right">Discount amt</th>
            <th className="px-3 py-2 text-right">After discount</th>
            <th className="px-3 py-2 text-right">Tax amt</th>
            <th className="px-3 py-2 text-right">Line total</th>
            {editable && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((line) => (
            <tr key={line.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{line.description}</td>
              <td className="px-3 py-2 text-right">{line.quantity}</td>
              <td className="px-3 py-2 text-right">
                {formatMoney(line.unitPrice)}
              </td>
              <td className="px-3 py-2 text-right">{describeDiscount(line)}</td>
              <td className="px-3 py-2 text-right">{line.taxPercent}</td>
              <td className="px-3 py-2 text-right">
                {formatMoney(line.subtotal)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatMoney(line.discountAmount)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatMoney(line.afterDiscount)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatMoney(line.taxAmount)}
              </td>
              <td className="px-3 py-2 text-right font-medium">
                {formatMoney(line.lineTotal)}
              </td>
              {editable && (
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onEdit?.(line)}
                    className="mr-2 text-slate-700 underline disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemove?.(line)}
                    className="text-red-700 underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
