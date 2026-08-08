export interface LineItemDiscount {
  type: 'percent' | 'fixed';
  value: number;
}

export interface LineItemInput {
  quantity: number;
  unitPrice: number;
  discount?: LineItemDiscount | null;
  taxPercent?: number;
}

export interface LineItemResult {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface DocumentTotals {
  lineResults: LineItemResult[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

function computeDiscountAmount(
  subtotal: number,
  discount: LineItemDiscount | null | undefined,
): number {
  if (!discount) {
    return 0;
  }

  if (discount.type === 'percent') {
    return Math.round((subtotal * discount.value) / 100);
  }

  // Clamp a fixed discount to the line subtotal so a line can never go negative.
  return Math.min(discount.value, subtotal);
}

export function computeLineItem(input: LineItemInput): LineItemResult {
  const subtotal = input.quantity * input.unitPrice;
  const discountAmount = computeDiscountAmount(subtotal, input.discount);
  const afterDiscount = subtotal - discountAmount;

  // Tax applies to the discounted amount, not the original subtotal.
  const taxAmount = Math.round((afterDiscount * (input.taxPercent ?? 0)) / 100);

  return {
    subtotal,
    discountAmount,
    afterDiscount,
    taxAmount,
    lineTotal: afterDiscount + taxAmount,
  };
}

export function computeDocumentTotals(
  lineItems: LineItemInput[],
): DocumentTotals {
  const lineResults = lineItems.map((lineItem) => computeLineItem(lineItem));

  // Document totals are exact sums of already-rounded line values; no rounding happens here.
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let grandTotal = 0;

  for (const line of lineResults) {
    subtotal += line.subtotal;
    totalDiscount += line.discountAmount;
    totalTax += line.taxAmount;
    grandTotal += line.lineTotal;
  }

  return { lineResults, subtotal, totalDiscount, totalTax, grandTotal };
}
