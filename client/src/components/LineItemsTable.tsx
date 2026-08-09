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

// Every monetary column is rendered from the server's response; nothing here is recalculated.
// The table is split into what the user entered and what the server derived from it, so a row
// reads as the calculation it is.
export default function LineItemsTable({
  lineItems,
  editable,
  busy,
  onEdit,
  onRemove,
}: Props) {
  if (lineItems.length === 0) {
    return (
      <div className="panel px-6 py-10 text-center">
        <p className="text-sm font-medium">No line items yet</p>
        <p className="mt-1 text-sm text-muted">
          {editable
            ? 'Add one below and the server will price it.'
            : 'This document was finalized without any.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: the full derivation, banded into inputs and results. */}
      <div className="panel hidden overflow-hidden lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule">
              <th colSpan={5} className="band px-4 pt-3 pb-1 text-left">
                Entered
              </th>
              <th
                colSpan={5}
                className="band border-l border-rule bg-ledger px-4 pt-3 pb-1 text-left"
              >
                Derived by the server
              </th>
              {editable && <th className="bg-ledger" />}
            </tr>
            <tr className="border-b border-rule text-[0.6875rem] tracking-wide text-muted uppercase">
              <th className="px-4 pb-2 text-left font-semibold">Description</th>
              <th className="px-3 pb-2 text-right font-semibold">Qty</th>
              <th className="px-3 pb-2 text-right font-semibold">Unit price</th>
              <th className="px-3 pb-2 text-right font-semibold">Discount</th>
              <th className="px-3 pb-2 text-right font-semibold">Tax</th>
              <th className="border-l border-rule bg-ledger px-3 pb-2 text-right font-semibold">
                Subtotal
              </th>
              <th className="bg-ledger px-3 pb-2 text-right font-semibold">
                − Discount
              </th>
              <th className="bg-ledger px-3 pb-2 text-right font-semibold">
                = After
              </th>
              <th className="bg-ledger px-3 pb-2 text-right font-semibold">
                + Tax
              </th>
              <th className="bg-ledger px-4 pb-2 text-right font-semibold">
                = Line total
              </th>
              {editable && <th className="bg-ledger px-4 pb-2" />}
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
                <td className="figure px-3 py-3 text-right">
                  {describeDiscount(line)}
                </td>
                <td className="figure px-3 py-3 text-right">
                  {line.taxPercent}%
                </td>
                <td className="figure border-l border-rule bg-ledger/60 px-3 py-3 text-right">
                  {formatMoney(line.subtotal)}
                </td>
                <td className="figure bg-ledger/60 px-3 py-3 text-right text-muted">
                  {formatMoney(line.discountAmount)}
                </td>
                <td className="figure bg-ledger/60 px-3 py-3 text-right">
                  {formatMoney(line.afterDiscount)}
                </td>
                <td className="figure bg-ledger/60 px-3 py-3 text-right text-muted">
                  {formatMoney(line.taxAmount)}
                </td>
                <td className="figure bg-ledger/60 px-4 py-3 text-right font-semibold">
                  {formatMoney(line.lineTotal)}
                </td>
                {editable && (
                  <td className="bg-ledger/60 px-4 py-3 text-right whitespace-nowrap">
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

      {/* Mobile: the same derivation as a stacked ledger, so nothing is hidden behind a scroll. */}
      <ul className="space-y-3 lg:hidden">
        {lineItems.map((line) => (
          <li key={line.id} className="panel overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium break-words">{line.description}</p>
                <p className="figure mt-0.5 text-xs text-muted">
                  {line.quantity} × {formatMoney(line.unitPrice)}
                  {line.discount ? ` · ${describeDiscount(line)} off` : ''}
                  {line.taxPercent ? ` · ${line.taxPercent}% tax` : ''}
                </p>
              </div>
              <div className="figure shrink-0 text-right text-base font-semibold">
                {formatMoney(line.lineTotal)}
              </div>
            </div>

            <dl className="border-t border-rule bg-ledger px-4 py-3 text-xs">
              {[
                { label: 'Subtotal', value: line.subtotal, op: '' },
                { label: 'Discount', value: line.discountAmount, op: '−' },
                { label: 'After discount', value: line.afterDiscount, op: '=' },
                { label: 'Tax', value: line.taxAmount, op: '+' },
                { label: 'Line total', value: line.lineTotal, op: '=' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-0.5">
                  <dt className="text-muted">
                    <span
                      aria-hidden
                      className="figure mr-1.5 inline-block w-2"
                    >
                      {row.op}
                    </span>
                    {row.label}
                  </dt>
                  <dd className="figure">{formatMoney(row.value)}</dd>
                </div>
              ))}
            </dl>

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
