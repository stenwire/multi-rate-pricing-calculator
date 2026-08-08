import {
  computeDocumentTotals,
  computeLineItem,
  LineItemInput,
} from '../src/services/calculator';

describe('computeLineItem', () => {
  it('applies no discount and no tax', () => {
    expect(
      computeLineItem({ quantity: 3, unitPrice: 1000, taxPercent: 0 }),
    ).toEqual({
      subtotal: 3000,
      discountAmount: 0,
      afterDiscount: 3000,
      taxAmount: 0,
      lineTotal: 3000,
    });
  });

  it('applies a percent discount with no tax', () => {
    expect(
      computeLineItem({
        quantity: 1,
        unitPrice: 10000,
        discount: { type: 'percent', value: 25 },
        taxPercent: 0,
      }),
    ).toEqual({
      subtotal: 10000,
      discountAmount: 2500,
      afterDiscount: 7500,
      taxAmount: 0,
      lineTotal: 7500,
    });
  });

  it('applies a fixed discount with no tax', () => {
    expect(
      computeLineItem({
        quantity: 1,
        unitPrice: 5000,
        discount: { type: 'fixed', value: 1500 },
        taxPercent: 0,
      }),
    ).toEqual({
      subtotal: 5000,
      discountAmount: 1500,
      afterDiscount: 3500,
      taxAmount: 0,
      lineTotal: 3500,
    });
  });

  it('clamps a fixed discount that exceeds the line subtotal', () => {
    expect(
      computeLineItem({
        quantity: 1,
        unitPrice: 1000,
        discount: { type: 'fixed', value: 5000 },
        taxPercent: 0,
      }),
    ).toEqual({
      subtotal: 1000,
      discountAmount: 1000,
      afterDiscount: 0,
      taxAmount: 0,
      lineTotal: 0,
    });
  });

  it('applies tax with no discount', () => {
    expect(
      computeLineItem({ quantity: 2, unitPrice: 10000, taxPercent: 10 }),
    ).toEqual({
      subtotal: 20000,
      discountAmount: 0,
      afterDiscount: 20000,
      taxAmount: 2000,
      lineTotal: 22000,
    });
  });

  it('applies tax to the discounted amount, not the original subtotal', () => {
    expect(
      computeLineItem({
        quantity: 4,
        unitPrice: 2500,
        discount: { type: 'percent', value: 20 },
        taxPercent: 8,
      }),
    ).toEqual({
      subtotal: 10000,
      discountAmount: 2000,
      afterDiscount: 8000,
      taxAmount: 640,
      lineTotal: 8640,
    });
  });

  it('rounds each percentage step to the nearest cent', () => {
    // discount = round(3333 * 15 / 100) = round(499.95) = 500
    // tax      = round(2833 *  7 / 100) = round(198.31) = 198
    expect(
      computeLineItem({
        quantity: 1,
        unitPrice: 3333,
        discount: { type: 'percent', value: 15 },
        taxPercent: 7,
      }),
    ).toEqual({
      subtotal: 3333,
      discountAmount: 500,
      afterDiscount: 2833,
      taxAmount: 198,
      lineTotal: 3031,
    });
  });

  it('treats an omitted discount and an omitted taxPercent as zero', () => {
    expect(computeLineItem({ quantity: 2, unitPrice: 1250 })).toEqual({
      subtotal: 2500,
      discountAmount: 0,
      afterDiscount: 2500,
      taxAmount: 0,
      lineTotal: 2500,
    });
  });
});

describe('computeDocumentTotals', () => {
  it('returns all zeros for an empty line item array', () => {
    expect(computeDocumentTotals([])).toEqual({
      lineResults: [],
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      grandTotal: 0,
    });
  });

  it('sums document totals as exact sums of the rounded line values', () => {
    const lineItems: LineItemInput[] = [
      {
        quantity: 1,
        unitPrice: 3333,
        discount: { type: 'percent', value: 15 },
        taxPercent: 7,
      },
      {
        quantity: 2,
        unitPrice: 1999,
        discount: { type: 'percent', value: 33 },
        taxPercent: 6.5,
      },
      {
        quantity: 3,
        unitPrice: 777,
        discount: { type: 'fixed', value: 100 },
        taxPercent: 12.25,
      },
      {
        quantity: 1,
        unitPrice: 50,
        discount: { type: 'fixed', value: 999 },
        taxPercent: 9,
      },
    ];

    const totals = computeDocumentTotals(lineItems);

    expect(totals.lineResults).toHaveLength(4);
    expect(totals.subtotal).toBe(
      totals.lineResults.reduce((sum, line) => sum + line.subtotal, 0),
    );
    expect(totals.totalDiscount).toBe(
      totals.lineResults.reduce((sum, line) => sum + line.discountAmount, 0),
    );
    expect(totals.totalTax).toBe(
      totals.lineResults.reduce((sum, line) => sum + line.taxAmount, 0),
    );
    expect(totals.grandTotal).toBe(
      totals.lineResults.reduce((sum, line) => sum + line.lineTotal, 0),
    );

    // The rounding policy guarantees this identity holds exactly (spec §7.4).
    expect(totals.grandTotal).toBe(
      totals.subtotal - totals.totalDiscount + totals.totalTax,
    );

    // Every value stays an integer number of cents.
    for (const value of Object.values(totals).flat()) {
      if (typeof value === 'number') {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });
});

describe('sample document from spec §7.6', () => {
  const sampleLineItems: LineItemInput[] = [
    {
      quantity: 2,
      unitPrice: 10000,
      discount: { type: 'percent', value: 10 },
      taxPercent: 5,
    },
    { quantity: 1, unitPrice: 5000, discount: null, taxPercent: 5 },
    {
      quantity: 1,
      unitPrice: 20000,
      discount: { type: 'fixed', value: 2000 },
      taxPercent: 0,
    },
  ];

  it('computes Widget A, Widget B and the service fee exactly', () => {
    const { lineResults } = computeDocumentTotals(sampleLineItems);

    expect(lineResults[0]).toEqual({
      subtotal: 20000,
      discountAmount: 2000,
      afterDiscount: 18000,
      taxAmount: 900,
      lineTotal: 18900,
    });

    expect(lineResults[1]).toEqual({
      subtotal: 5000,
      discountAmount: 0,
      afterDiscount: 5000,
      taxAmount: 250,
      lineTotal: 5250,
    });

    expect(lineResults[2]).toEqual({
      subtotal: 20000,
      discountAmount: 2000,
      afterDiscount: 18000,
      taxAmount: 0,
      lineTotal: 18000,
    });
  });

  it('computes the document totals exactly', () => {
    const totals = computeDocumentTotals(sampleLineItems);

    expect(totals.subtotal).toBe(45000);
    expect(totals.totalDiscount).toBe(4000);
    expect(totals.totalTax).toBe(1150);
    expect(totals.grandTotal).toBe(42150);
  });
});
