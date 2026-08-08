import { IDocument, LineItemAttributes } from '../models/Document';
import { LineItemInput, computeDocumentTotals } from './calculator';

type LineItemFields = Pick<
  LineItemAttributes,
  'description' | 'quantity' | 'unitPrice' | 'discount' | 'taxPercent'
>;

function toCalculatorInput(fields: LineItemFields): LineItemInput {
  return {
    quantity: fields.quantity,
    unitPrice: fields.unitPrice,
    discount: fields.discount,
    taxPercent: fields.taxPercent,
  };
}

// Single point of truth for writing money onto a document. Every create and every line-item
// mutation routes through here, so no handler ever computes a total itself. Callers may push
// raw input fields and leave the computed ones unset: Mongoose validates required paths at
// save() time, by which point this has filled them in.
export function recalculateDocument(document: IDocument): void {
  const totals = computeDocumentTotals(
    document.lineItems.map(toCalculatorInput),
  );

  document.lineItems.forEach((line, index) => {
    const result = totals.lineResults[index];
    line.subtotal = result.subtotal;
    line.discountAmount = result.discountAmount;
    line.afterDiscount = result.afterDiscount;
    line.taxAmount = result.taxAmount;
    line.lineTotal = result.lineTotal;
  });

  document.subtotal = totals.subtotal;
  document.totalDiscount = totals.totalDiscount;
  document.totalTax = totals.totalTax;
  document.grandTotal = totals.grandTotal;
}
