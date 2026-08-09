import { formatMoney } from '../utils/format';

interface Props {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

function Term({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.625rem] font-semibold tracking-[0.12em] text-muted uppercase">
        {label}
      </div>
      <div className="figure mt-0.5 text-sm font-medium sm:text-base">
        {formatMoney(value)}
      </div>
    </div>
  );
}

function Operator({ symbol }: { symbol: string }) {
  return (
    <div
      aria-hidden
      className="figure self-end pb-0.5 text-base text-muted sm:text-lg"
    >
      {symbol}
    </div>
  );
}

// The document's totals are shown as the equation they satisfy. Rounding happens at most twice
// per line and never at document level, so this identity holds exactly - showing it as an
// equation is the clearest way to say so.
export default function DocumentTotals({
  subtotal,
  totalDiscount,
  totalTax,
  grandTotal,
}: Props) {
  return (
    <section className="panel overflow-hidden" aria-label="Document totals">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-4 bg-ledger px-4 py-4 sm:px-6">
        <Term label="Subtotal" value={subtotal} />
        <Operator symbol="−" />
        <Term label="Discount" value={totalDiscount} />
        <Operator symbol="+" />
        <Term label="Tax" value={totalTax} />
        <Operator symbol="=" />
        <div className="min-w-0">
          <div className="text-[0.625rem] font-semibold tracking-[0.12em] text-muted uppercase">
            Grand total
          </div>
          <div className="figure mt-0.5 text-xl font-semibold sm:text-2xl">
            {formatMoney(grandTotal)}
          </div>
        </div>
      </div>
    </section>
  );
}
