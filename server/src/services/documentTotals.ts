import { IDocument, LineItemAttributes } from '../models/Document';
import {
  LineItemInput,
  computeDocumentTotals,
  computeLineItem,
} from './calculator';

export type LineItemFields = Pick<
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

export function toPersistedLineItem(
  fields: LineItemFields,
): LineItemAttributes {
  return { ...fields, ...computeLineItem(toCalculatorInput(fields)) };
}

// Single point of truth for writing money onto a document. Every create and every line-item
// mutation routes through here, so no handler ever computes a total itself.
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
