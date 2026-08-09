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

function RowActions({
  line,
  busy,
  onEdit,
  onRemove,
}: Pick<Props, 'busy' | 'onEdit' | 'onRemove'> & { line: LineItem }) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => onEdit?.(line)}
        className="text-sm font-medium text-accrual hover:underline disabled:opacity-50"
      >
        Edit
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onRemove?.(line)}
        className="text-sm font-medium text-flag hover:underline disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}

// Every monetary column is rendered from the API response; nothing here is recalculated.
export default function LineItemsTable({
  lineItems,
  editable,
  busy,
  onEdit,
  onRemove,
}: Props) {
  if (lineItems.length === 0) {
    return (
      <div className="panel px-6 py-12 text-center">
        <p className="text-sm font-medium">No line items yet</p>
        <p className="mt-1 text-sm text-muted">
          {editable
            ? 'Add your first line item below.'
            : 'This document was finalized without any.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="panel hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-[0.6875rem] tracking-wide text-muted uppercase">
              <th className="px-4 py-3 text-left font-semibold">Description</th>
              <th className="px-3 py-3 text-right font-semibold">Qty</th>
              <th className="px-3 py-3 text-right font-semibold">Unit price</th>
              <th className="px-3 py-3 text-right font-semibold">Discount</th>
              <th className="px-3 py-3 text-right font-semibold">Tax rate</th>
              <th className="px-3 py-3 text-right font-semibold">Subtotal</th>
              <th className="px-3 py-3 text-right font-semibold">
                Less discount
              </th>
              <th className="px-3 py-3 text-right font-semibold">
                After discount
              </th>
              <th className="px-3 py-3 text-right font-semibold">Plus tax</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              {editable && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((line) => (
              <tr
                key={line.id}
                className="border-b border-rule last:border-0 hover:bg-paper"
              >
                <td className="px-4 py-3 font-medium">{line.description}</td>
                <td className="figure px-3 py-3 text-right">{line.quantity}</td>
                <td className="figure px-3 py-3 text-right">
                  {formatMoney(line.unitPrice)}
                </td>
                <td className="figure px-3 py-3 text-right text-muted">
                  {describeDiscount(line)}
                </td>
                <td className="figure px-3 py-3 text-right text-muted">
                  {line.taxPercent}%
                </td>
                <td className="figure px-3 py-3 text-right">
                  {formatMoney(line.subtotal)}
                </td>
                <td className="figure px-3 py-3 text-right text-muted">
                  {line.discountAmount > 0
                    ? `−${formatMoney(line.discountAmount)}`
                    : '—'}
                </td>
                <td className="figure px-3 py-3 text-right">
                  {formatMoney(line.afterDiscount)}
                </td>
                <td className="figure px-3 py-3 text-right text-muted">
                  {formatMoney(line.taxAmount)}
                </td>
                <td className="figure px-4 py-3 text-right font-semibold">
                  {formatMoney(line.lineTotal)}
                </td>
                {editable && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <RowActions
                      line={line}
                      busy={busy}
                      onEdit={onEdit}
                      onRemove={onRemove}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: the same information as cards, with the breakdown tucked away. */}
      <ul className="space-y-3 lg:hidden">
        {lineItems.map((line) => (
          <li key={line.id} className="panel overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium break-words">{line.description}</p>
                <p className="mt-0.5 text-sm text-muted">
                  <span className="figure">{line.quantity}</span> ×{' '}
                  <span className="figure">{formatMoney(line.unitPrice)}</span>
                  {line.discount ? ` · ${describeDiscount(line)} off` : ''}
                  {line.taxPercent ? ` · ${line.taxPercent}% tax` : ''}
                </p>
              </div>
              <p className="figure shrink-0 text-base font-semibold">
                {formatMoney(line.lineTotal)}
              </p>
            </div>

            <details className="border-t border-rule">
              <summary className="px-4 py-2.5 text-xs font-medium text-muted marker:content-['']">
                Breakdown
              </summary>
              <dl className="bg-ledger px-4 py-3 text-xs">
                {[
                  { label: 'Subtotal', value: formatMoney(line.subtotal) },
                  {
                    label: 'Discount',
                    value:
                      line.discountAmount > 0
                        ? `−${formatMoney(line.discountAmount)}`
                        : '—',
                  },
                  {
                    label: 'After discount',
                    value: formatMoney(line.afterDiscount),
                  },
                  { label: 'Tax', value: formatMoney(line.taxAmount) },
                  { label: 'Amount', value: formatMoney(line.lineTotal) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-0.5">
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="figure">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </details>

            {editable && (
              <div className="border-t border-rule px-4 py-2.5">
                <RowActions
                  line={line}
                  busy={busy}
                  onEdit={onEdit}
                  onRemove={onRemove}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
