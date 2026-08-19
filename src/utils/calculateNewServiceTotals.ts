import { type NewServiceLineItemDraft, type NewServicePaymentDraft, type NewServiceTotals } from '../types/newService';

function toMoneyNumber(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function calculateNewServiceTotals(
  lineItems: NewServiceLineItemDraft[],
  payment: NewServicePaymentDraft,
): NewServiceTotals {
  const totals = lineItems.reduce(
    (current, lineItem) => {
      const quantity = Math.max(1, Math.floor(toMoneyNumber(lineItem.quantity)));
      const total = quantity * Math.max(0, toMoneyNumber(lineItem.actualUnitPrice));

      if (lineItem.itemType === 'labor') {
        current.laborTotal += total;
      } else if (lineItem.itemType === 'part') {
        current.partsTotal += total;
      } else {
        current.extraTotal += total;
      }

      return current;
    },
    {
      laborTotal: 0,
      partsTotal: 0,
      extraTotal: 0,
    },
  );
  const calculatedTotal = totals.laborTotal + totals.partsTotal + totals.extraTotal;
  const discountAmount = Math.min(calculatedTotal, Math.max(0, toMoneyNumber(payment.discountAmount)));
  const finalTotal = Math.max(0, calculatedTotal - discountAmount);
  const paidAmount = Math.max(0, toMoneyNumber(payment.paidAmount));
  const remainingAmount = Math.max(0, finalTotal - paidAmount);
  const paymentStatus = paidAmount >= finalTotal && finalTotal > 0
    ? 'paid'
    : paidAmount > 0
      ? 'partially_paid'
      : 'unpaid';

  return {
    ...totals,
    calculatedTotal,
    discountAmount,
    finalTotal,
    paidAmount,
    remainingAmount,
    paymentStatus,
  };
}
