import { type AiFillNewServiceResponse } from '../src/schemas/aiFillNewService';
import { type ProfessionalServiceNoteResponse } from '../src/schemas/professionalServiceNote';
import { type InjectorModelPrice, type PriceItem } from '../src/types/catalog';
import { applyAiNewServiceDraft } from '../src/utils/applyAiNewServiceDraft';
import { calculateNewServiceTotals } from '../src/utils/calculateNewServiceTotals';
import { buildProfessionalNotePriceSuggestion } from '../src/utils/professionalNotePricing';
import { reconcileServiceLineItemsForConfirmedPrice } from '../src/utils/reconcileServiceLineItems';

const laborSokulmeId = '00000000-0000-0000-0000-000000000001';
const partIyneId = '00000000-0000-0000-0000-000000000002';
const optionCinIyneId = '00000000-0000-0000-0000-000000000003';
const modelId = '00000000-0000-0000-0000-000000000004';
const partQapaqId = '00000000-0000-0000-0000-000000000005';
const partSaybaId = '00000000-0000-0000-0000-000000000006';

const labor: PriceItem[] = [
  createPriceItem(laborSokulmeId, 'Sökülmə', 'labor'),
];

const parts: PriceItem[] = [
  {
    ...createPriceItem(partIyneId, 'İynə', 'part'),
    options: [
      {
        id: optionCinIyneId,
        priceItemId: partIyneId,
        optionName: 'Çin iynə',
        isActive: true,
        sortOrder: 10,
        createdAt: '',
        updatedAt: '',
      },
    ],
  },
  createPriceItem(partQapaqId, 'Qapaq', 'part'),
  createPriceItem(partSaybaId, 'Şayba', 'part'),
];

const modelPrices: InjectorModelPrice[] = [
  createModelPrice(laborSokulmeId, null, 'labor', 10),
  createModelPrice(partIyneId, optionCinIyneId, 'part', 35),
  createModelPrice(partQapaqId, null, 'part', 45),
  createModelPrice(partSaybaId, null, 'part', 2.5),
];

const baseAiResult: AiFillNewServiceResponse = {
  vehicle: {
    licensePlate: '99AA999',
    brand: 'Mercedes',
    phone: '0553119723',
    mileage: 50000,
    problemDescription: null,
  },
  injector: {
    count: 4,
    company: 'Delphi',
    code: '1',
  },
  details: [],
  injectorProblems: [],
  payment: {
    discountAmount: 10,
    discountedPrice: null,
    paidAmount: null,
    note: null,
  },
  problemCustomer: {
    isProblemCustomer: null,
    problemReason: null,
  },
  warnings: [],
};

const allInjectorsDraft = applyAiNewServiceDraft({
  ...baseAiResult,
  details: [
    {
      name: 'sokulme',
      optionName: null,
      itemType: 'labor',
      injectorNumbers: [],
      price: null,
    },
  ],
}, { labor, parts }, modelPrices, modelId);

assertEqual(allInjectorsDraft.lineItems.length, 4);
assertDeepEqual(
  allInjectorsDraft.lineItems.map((item) => item.selectedInjectorNumbers[0]),
  [1, 2, 3, 4],
);
assertEqual(allInjectorsDraft.lineItems.every((item) => item.itemName === 'Sökülmə'), true);

const selectedInjectorsDraft = applyAiNewServiceDraft({
  ...baseAiResult,
  details: [
    {
      name: 'yeni Çin iynə',
      optionName: null,
      itemType: 'part',
      injectorNumbers: [1, 3],
      price: null,
    },
  ],
}, { labor, parts }, modelPrices, modelId);

assertEqual(selectedInjectorsDraft.lineItems.length, 2);
assertDeepEqual(
  selectedInjectorsDraft.lineItems.map((item) => item.selectedInjectorNumbers[0]),
  [1, 3],
);
assertEqual(selectedInjectorsDraft.lineItems.every((item) => item.itemName === 'İynə'), true);
assertEqual(selectedInjectorsDraft.lineItems.every((item) => item.optionName === 'Çin iynə'), true);

const unknownDraft = applyAiNewServiceDraft({
  ...baseAiResult,
  details: [
    {
      name: 'Stend xüsusi yoxlama',
      optionName: null,
      itemType: 'labor',
      injectorNumbers: [2],
      price: 12,
    },
  ],
}, { labor, parts }, modelPrices, modelId);

assertEqual(unknownDraft.lineItems.length, 1);
assertEqual(unknownDraft.lineItems[0]?.itemName, 'Stend xüsusi yoxlama');
assertEqual(unknownDraft.lineItems[0]?.priceSource, 'manual_price');
assertEqual(unknownDraft.warnings.some((warning) => warning.includes('Kataloqda tapılmadı')), true);

const totals = calculateNewServiceTotals(allInjectorsDraft.lineItems, allInjectorsDraft.payment);
assertEqual(totals.calculatedTotal, 40);
assertEqual(totals.discountAmount, 10);
assertEqual(totals.finalTotal, 30);

const allInjectorCatalogSuggestion = buildProfessionalNotePriceSuggestion(createProfessionalResult({
  priceTotalSource: 'none',
  detectedOperations: [
    createDetectedOperation({
      name: 'Bütün forsunkalarda sokulme oldu',
      itemType: 'labor',
      appliesToAllInjectors: true,
    }),
  ],
}), { labor, parts, extras: [] }, modelPrices);
assertEqual(allInjectorCatalogSuggestion.priceTotal, 40);
assertEqual(allInjectorCatalogSuggestion.priceLines[0]?.source, 'catalog');
assertEqual(allInjectorCatalogSuggestion.priceLines[0]?.lineItem?.applyTarget, 'all_injectors');
assertEqual(allInjectorCatalogSuggestion.priceLines[0]?.lineItem?.quantity, '4');

const cinIyneSuggestion = buildProfessionalNotePriceSuggestion(createProfessionalResult({
  priceTotalSource: 'none',
  detectedOperations: [
    createDetectedOperation({
      name: 'yeni Çin iynə',
      itemType: 'part',
      injectorNumbers: [1],
    }),
  ],
}), { labor, parts, extras: [] }, modelPrices);
assertEqual(cinIyneSuggestion.priceTotal, 35);
assertEqual(cinIyneSuggestion.priceLines[0]?.name, 'İynə - Çin iynə');
assertEqual(cinIyneSuggestion.priceLines[0]?.lineItem?.itemName, 'İynə');
assertEqual(cinIyneSuggestion.priceLines[0]?.lineItem?.optionName, 'Çin iynə');
assertEqual(cinIyneSuggestion.priceLines[0]?.lineItem?.applyTarget, 'single_injector');

const saybaSuggestion = buildProfessionalNotePriceSuggestion(createProfessionalResult({
  priceTotalSource: 'none',
  detectedOperations: [
    createDetectedOperation({
      name: 'dördünün də şaybası dəyişildi',
      itemType: 'part',
      appliesToAllInjectors: true,
      quantity: 4,
    }),
  ],
}), { labor, parts, extras: [] }, modelPrices);
assertEqual(saybaSuggestion.priceTotal, 10);
assertEqual(saybaSuggestion.priceLines[0]?.lineItem?.actualUnitPrice, '2.5');

const spokenPriceSuggestion = buildProfessionalNotePriceSuggestion(createProfessionalResult({
  priceTotal: 100,
  priceTotalSource: 'stated_lines',
  priceLines: [{ name: 'Valf dəyişdirildi', amount: 100, source: 'spoken', scope: 'Ümumi xidmət' }],
  detectedOperations: [
    createDetectedOperation({
      name: 'valfi dəyişdik',
      itemType: 'part',
      statedPrice: 100,
    }),
  ],
}), { labor, parts, extras: [] }, modelPrices);
assertEqual(spokenPriceSuggestion.priceTotal, 100);
assertEqual(spokenPriceSuggestion.priceLines[0]?.source, 'spoken');
assertEqual(spokenPriceSuggestion.priceLines[0]?.lineItem?.itemName, 'Qapaq');
assertEqual(spokenPriceSuggestion.priceLines[0]?.lineItem?.actualUnitPrice, '100');

const unmatchedSuggestion = buildProfessionalNotePriceSuggestion(createProfessionalResult({
  priceTotalSource: 'none',
  detectedOperations: [
    createDetectedOperation({
      name: 'xüsusi balans işi',
      itemType: 'labor',
    }),
  ],
}), { labor, parts, extras: [] }, []);
assertEqual(unmatchedSuggestion.priceTotal, 0);
assertEqual(unmatchedSuggestion.priceLines[0]?.lineItem, undefined);
assertEqual(unmatchedSuggestion.warnings.some((warning) => warning.includes('Kataloqda tapılmadı')), true);

const pricedUnmatchedSuggestion = buildProfessionalNotePriceSuggestion(createProfessionalResult({
  priceTotalSource: 'none',
  detectedOperations: [
    createDetectedOperation({
      name: 'xüsusi balans işi',
      itemType: 'labor',
      statedPrice: 15,
    }),
  ],
}), { labor, parts, extras: [] }, []);
assertEqual(pricedUnmatchedSuggestion.priceTotal, 15);
assertEqual(pricedUnmatchedSuggestion.priceLines[0]?.lineItem?.itemName, 'xüsusi balans işi');
assertEqual(pricedUnmatchedSuggestion.priceLines[0]?.lineItem?.priceSource, 'manual_price');

const totalOverrideSuggestion = buildProfessionalNotePriceSuggestion(createProfessionalResult({
  priceTotal: 110,
  priceTotalSource: 'stated_total',
  priceLines: [{ name: 'Ümumi məbləğ', amount: 110, source: 'spoken', scope: 'Ümumi xidmət' }],
  detectedOperations: [
    createDetectedOperation({
      name: 'Bütün forsunkalarda sokulme oldu',
      itemType: 'labor',
      appliesToAllInjectors: true,
    }),
  ],
}), { labor, parts, extras: [] }, modelPrices);
assertEqual(totalOverrideSuggestion.priceTotal, 110);
assertEqual(totalOverrideSuggestion.priceLines[0]?.lineItem?.actualUnitPrice, '10');
assertEqual(totalOverrideSuggestion.warnings.some((warning) => warning.includes('fərqlidir')), true);

const reconciledHigher = reconcileServiceLineItemsForConfirmedPrice(
  allInjectorCatalogSuggestion.priceLines
    .map((line) => line.lineItem)
    .filter((lineItem): lineItem is NonNullable<typeof lineItem> => Boolean(lineItem)),
  { discountAmount: '0', paidAmount: '0', paymentMethod: '', note: '' },
  '55',
);
assertEqual(reconciledHigher.lineItems.length, 2);
assertEqual(reconciledHigher.lineItems[1]?.itemName, 'Qiymət düzəlişi');
assertEqual(reconciledHigher.lineItems[1]?.actualUnitPrice, '15');

const reconciledLower = reconcileServiceLineItemsForConfirmedPrice(
  allInjectorCatalogSuggestion.priceLines
    .map((line) => line.lineItem)
    .filter((lineItem): lineItem is NonNullable<typeof lineItem> => Boolean(lineItem)),
  { discountAmount: '5', paidAmount: '0', paymentMethod: '', note: '' },
  '30',
);
assertEqual(reconciledLower.payment.discountAmount, '15');

console.log('AI mapper regression tests passed.');

function createProfessionalResult(patch: Partial<ProfessionalServiceNoteResponse>): ProfessionalServiceNoteResponse {
  return {
    professionalText: '',
    priceLines: [],
    priceTotal: 0,
    priceTotalSource: 'none',
    detectedOperations: [],
    warnings: [],
    missingInfo: [],
    injector: {
      count: 4,
      company: 'Delphi',
      code: '1',
    },
    ...patch,
  };
}

function createDetectedOperation(
  patch: Partial<ProfessionalServiceNoteResponse['detectedOperations'][number]>,
): ProfessionalServiceNoteResponse['detectedOperations'][number] {
  return {
    name: '',
    itemType: 'unknown',
    injectorNumbers: [],
    appliesToAllInjectors: false,
    quantity: null,
    statedPrice: null,
    sourceText: '',
    ...patch,
  };
}

function createPriceItem(id: string, name: string, type: PriceItem['type']): PriceItem {
  return {
    id,
    name,
    type,
    isActive: true,
    sortOrder: 10,
    createdAt: '',
    updatedAt: '',
    options: [],
  };
}

function createModelPrice(
  priceItemId: string,
  priceItemOptionId: string | null,
  itemType: InjectorModelPrice['itemType'],
  defaultPrice: number,
): InjectorModelPrice {
  return {
    id: `${priceItemId}-${priceItemOptionId ?? 'base'}`,
    injectorModelId: modelId,
    priceItemId,
    priceItemOptionId,
    itemType,
    defaultPrice,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };
}

function assertEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}
