import { useId, useState } from 'react';
import { formatMoney } from '../utils/format';

interface Props {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  label?: string;
  /** `invoice` sits under a document's line items; `report` spans a period summary. */
  variant?: 'invoice' | 'report';
}

function Working({
  id,
  subtotal,
  totalDiscount,
  totalTax,
  grandTotal,
}: Omit<Props, 'label' | 'variant'> & { id: string }) {
  return (
    <div id={id} className="mt-3 border-t border-rule pt-3 text-xs text-muted">
      <p>
        Each line is priced as its subtotal, less any discount, plus tax on the
        discounted amount. Percentages are rounded to the nearest cent as they
        are applied.
      </p>
      <p className="mt-2">
        These totals are the sum of the line amounts, so they always balance:
      </p>
      <p className="figure mt-2 text-ink">
        {formatMoney(subtotal)} − {formatMoney(totalDiscount)} +{' '}
        {formatMoney(totalTax)} = {formatMoney(grandTotal)}
      </p>
    </div>
  );
}

function SeeCalculation({
  expanded,
  onToggle,
  panelId,
}: {
  expanded: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={panelId}
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-ledger hover:text-ink"
    >
      <span
        aria-hidden
        className="grid h-3.5 w-3.5 place-items-center rounded-full border border-current text-[0.5625rem] leading-none font-semibold"
      >
        i
      </span>
      See calculation
    </button>
  );
}

export default function DocumentTotals({
  subtotal,
  totalDiscount,
  totalTax,
  grandTotal,
  label = 'Total',
  variant = 'invoice',
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const toggle = () => setExpanded((open) => !open);

  if (variant === 'report') {
    const figures = [
      { label: 'Subtotal', value: formatMoney(subtotal) },
      {
        label: 'Discount',
        value:
          totalDiscount > 0 ? `−${formatMoney(totalDiscount)}` : formatMoney(0),
      },
      { label: 'Tax', value: formatMoney(totalTax) },
    ];

    return (
      <section className="panel p-4 sm:p-6" aria-label="Totals">
        <div className="grid gap-5 sm:grid-cols-4">
          {figures.map((figure) => (
            <div key={figure.label}>
              <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
                {figure.label}
              </p>
              <p className="figure mt-1 text-lg">{figure.value}</p>
            </div>
          ))}
          <div className="border-t border-rule pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
            <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
              {label}
            </p>
            <p className="figure mt-1 text-2xl font-semibold">
              {formatMoney(grandTotal)}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-rule pt-4">
          <SeeCalculation
            expanded={expanded}
            onToggle={toggle}
            panelId={panelId}
          />
          {expanded && (
            <Working
              id={panelId}
              subtotal={subtotal}
              totalDiscount={totalDiscount}
              totalTax={totalTax}
              grandTotal={grandTotal}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="sm:flex sm:justify-end" aria-label="Totals">
      <div className="panel w-full p-4 sm:max-w-xs sm:p-5">
        <dl>
          <div className="flex items-baseline justify-between gap-6 py-1.5">
            <dt className="text-sm text-muted">Subtotal</dt>
            <dd className="figure text-sm">{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-1.5">
            <dt className="text-sm text-muted">Discount</dt>
            <dd className="figure text-sm">
              {totalDiscount > 0
                ? `−${formatMoney(totalDiscount)}`
                : formatMoney(0)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-1.5">
            <dt className="text-sm text-muted">Tax</dt>
            <dd className="figure text-sm">{formatMoney(totalTax)}</dd>
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-6 border-t border-rule pt-3">
            <dt className="text-sm font-semibold">{label}</dt>
            <dd className="figure text-xl font-semibold">
              {formatMoney(grandTotal)}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <SeeCalculation
            expanded={expanded}
            onToggle={toggle}
            panelId={panelId}
          />
          {expanded && (
            <Working
              id={panelId}
              subtotal={subtotal}
              totalDiscount={totalDiscount}
              totalTax={totalTax}
              grandTotal={grandTotal}
            />
          )}
        </div>
      </div>
    </section>
  );
}
