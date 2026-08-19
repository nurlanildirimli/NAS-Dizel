import {
  type NewServiceLineItemDraft,
  type NewServicePaymentDraft,
} from '../types/newService';

function toMoneyNumber(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumLineItems(lineItems: NewServiceLineItemDraft[]): number {
  return lineItems.reduce((total, lineItem) => {
    const quantity = Math.max(1, Math.floor(toMoneyNumber(lineItem.quantity)));
    const unitPrice = Math.max(0, toMoneyNumber(lineItem.actualUnitPrice));
    return total + (quantity * unitPrice);
  }, 0);
}

export function reconcileServiceLineItemsForConfirmedPrice(
  lineItems: NewServiceLineItemDraft[],
  payment: NewServicePaymentDraft,
  confirmedPrice: string,
): {
  lineItems: NewServiceLineItemDraft[];
  payment: NewServicePaymentDraft;
  note: string;
} {
  if (lineItems.length === 0) {
    return {
      lineItems,
      payment,
      note: '',
    };
  }

  const detailedTotal = roundMoney(sumLineItems(lineItems));
  const confirmedTotal = roundMoney(Math.max(0, toMoneyNumber(confirmedPrice)));
  const currentDiscount = roundMoney(Math.max(0, toMoneyNumber(payment.discountAmount)));
  const difference = roundMoney(confirmedTotal - detailedTotal);

  if (Math.abs(difference) < 0.01 || confirmedTotal <= 0) {
    return {
      lineItems,
      payment,
      note: '',
    };
  }

  if (difference > 0) {
    return {
      lineItems: [
        ...lineItems,
        {
          id: 'manual-price-adjustment',
          itemType: 'extra',
          itemName: 'Qiymət düzəlişi',
          optionName: null,
          applyTarget: 'general_service',
          selectedInjectorNumbers: [],
          quantity: '1',
          defaultUnitPrice: String(difference),
          actualUnitPrice: String(difference),
          priceSource: 'manual_price',
          note: 'Təsdiqdə yazılan qiymət detallı sətirlərin cəmindən yüksəkdir.',
        } satisfies NewServiceLineItemDraft,
      ],
      payment,
      note: `Qiymət düzəlişi əlavə olunacaq: ${difference.toFixed(2)} AZN`,
    };
  }

  const extraDiscount = Math.abs(difference);

  return {
    lineItems,
    payment: {
      ...payment,
      discountAmount: String(roundMoney(currentDiscount + extraDiscount)),
    },
    note: `Qiymət fərqi endirimə əlavə olunacaq: ${extraDiscount.toFixed(2)} AZN`,
  };
}
