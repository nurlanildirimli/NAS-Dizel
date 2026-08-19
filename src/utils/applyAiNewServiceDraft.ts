import { type AiCatalogHint, type AiFillNewServiceResponse } from '../schemas/aiFillNewService';
import { type InjectorModelPrice, type PriceItem } from '../types/catalog';
import {
  type InjectorCompany,
  type NewServiceInjectorDraft,
  type NewServiceLineItemDraft,
  type NewServicePaymentDraft,
  type NewServicePriceSource,
  type NewServiceVehicleDraft,
} from '../types/newService';
import { calculateNewServiceTotals } from './calculateNewServiceTotals';

type DetailRow = {
  id: string;
  itemType: 'labor' | 'part';
  itemName: string;
  optionName: string | null;
  label: string;
  defaultPrice: number;
  priceSource: NewServicePriceSource;
};

export type AppliedAiNewServiceDraft = {
  vehicle: NewServiceVehicleDraft;
  injector: NewServiceInjectorDraft;
  lineItems: NewServiceLineItemDraft[];
  payment: NewServicePaymentDraft;
  warnings: string[];
};

const knownProblems = [
  'Geri axın çoxdur',
  'Geri axın az',
  'Sızma var',
  'İynə problemi',
  'Qapaq problemi',
  'Elektrik problemi',
  'Kodlama problemi',
  'Çirklənmə',
  'Mexaniki zədə',
  'Problem yoxdur',
  'Digər',
];

export function buildAiCatalogHints(laborItems: PriceItem[], partItems: PriceItem[]): AiCatalogHint[] {
  return buildDetailRows(laborItems, partItems, []).map((row) => ({
    label: row.label,
    itemName: row.itemName,
    optionName: row.optionName,
    itemType: row.itemType,
  }));
}

export function applyAiNewServiceDraft(
  aiResult: AiFillNewServiceResponse,
  catalog: { labor: PriceItem[]; parts: PriceItem[] },
  modelPrices: InjectorModelPrice[],
  injectorModelId: string | null,
): AppliedAiNewServiceDraft {
  const count = aiResult.injector.count ?? 4;
  const injectorCount = Math.min(8, Math.max(1, count));
  const detailRows = buildDetailRows(catalog.labor, catalog.parts, modelPrices);
  const warnings = [...aiResult.warnings];
  const lineItems: NewServiceLineItemDraft[] = [];

  aiResult.details.forEach((detail, detailIndex) => {
    const injectorNumbers = normalizeInjectorNumbers(detail.injectorNumbers, injectorCount);
    const row = findBestDetailRow(detailRows, detail.name, detail.optionName, detail.itemType);

    injectorNumbers.forEach((injectorNumber) => {
      if (row) {
        const price = detail.price ?? row.defaultPrice;
        lineItems.push({
          id: `injector-detail-${injectorNumber}-${row.id}`,
          itemType: row.itemType,
          itemName: row.itemName,
          optionName: row.optionName,
          applyTarget: 'single_injector',
          selectedInjectorNumbers: [injectorNumber],
          quantity: '1',
          defaultUnitPrice: String(row.defaultPrice),
          actualUnitPrice: String(price),
          priceSource: row.priceSource,
          note: '',
        });
        return;
      }

      const price = detail.price ?? 0;
      const name = detail.name.trim() || 'AI detal';
      warnings.push(`Kataloqda tapılmadı: ${name}. Manual detal kimi əlavə edildi.`);
      lineItems.push({
        id: `injector-detail-custom-${injectorNumber}-ai-${detailIndex}-${safeKey(name)}`,
        itemType: detail.itemType ?? 'part',
        itemName: name,
        optionName: detail.optionName?.trim() || null,
        applyTarget: 'single_injector',
        selectedInjectorNumbers: [injectorNumber],
        quantity: '1',
        defaultUnitPrice: String(price),
        actualUnitPrice: String(price),
        priceSource: 'manual_price',
        note: 'AI ilə əlavə edildi',
      });
    });
  });

  const uniqueLineItems = dedupeLineItems(lineItems);
  const problemByInjector = buildProblemMap(aiResult, injectorCount);
  const paymentBeforeDiscount: NewServicePaymentDraft = {
    discountAmount: '0',
    paidAmount: String(aiResult.payment.paidAmount ?? 0),
    paymentMethod: '',
    note: aiResult.payment.note?.trim() ?? '',
  };
  const totalsBeforeDiscount = calculateNewServiceTotals(uniqueLineItems, paymentBeforeDiscount);
  const discountAmount = aiResult.payment.discountAmount
    ?? (
      aiResult.payment.discountedPrice !== null
        ? Math.max(0, totalsBeforeDiscount.calculatedTotal - aiResult.payment.discountedPrice)
        : 0
    );

  return {
    vehicle: {
      selectedVehicleId: null,
      previousMileage: null,
      licensePlate: aiResult.vehicle.licensePlate?.trim() ?? '',
      brand: aiResult.vehicle.brand?.trim() ?? '',
      phone: aiResult.vehicle.phone?.trim() ?? '',
      mileage: aiResult.vehicle.mileage ? String(aiResult.vehicle.mileage) : '',
      problemDescription: aiResult.vehicle.problemDescription?.trim() ?? '',
      isProblemCustomer: aiResult.problemCustomer.isProblemCustomer ?? false,
      problemReason: aiResult.problemCustomer.problemReason?.trim() ?? '',
    },
    injector: {
      injectorCount,
      injectorCompany: (aiResult.injector.company ?? '') as InjectorCompany | '',
      injectorCode: aiResult.injector.code?.trim() ?? '',
      injectorSerialInfo: '',
      injectorModelId,
      useManualPricing: !injectorModelId,
      injectors: Array.from({ length: injectorCount }, (_, index) => {
        const injectorNumber = index + 1;
        const problemInfo = problemByInjector.get(injectorNumber);

        return {
          injectorNumber,
          initialTestResult: '',
          finalTestResult: '',
          injectorStatus: '',
          problemFound: problemInfo?.problems ?? [],
          workDone: [],
          partsReplaced: [],
          note: problemInfo?.note ?? '',
        };
      }),
    },
    lineItems: uniqueLineItems,
    payment: {
      discountAmount: String(discountAmount),
      paidAmount: String(aiResult.payment.paidAmount ?? 0),
      paymentMethod: '',
      note: aiResult.payment.note?.trim() ?? '',
    },
    warnings: [...new Set(warnings)],
  };
}

function buildDetailRows(laborItems: PriceItem[], partItems: PriceItem[], prices: InjectorModelPrice[]): DetailRow[] {
  return [...laborItems, ...partItems]
    .filter((item) => item.name !== 'Digər')
    .flatMap((item) => {
      const options = item.options.length > 0 ? item.options : [null];

      return options.map((option) => {
        const modelPrice = prices.find((price) => (
          price.priceItemId === item.id
          && price.priceItemOptionId === (option?.id ?? null)
        ));

        return {
          id: `${item.id}-${option?.id ?? 'base'}`,
          itemType: item.type === 'labor' ? 'labor' : 'part',
          itemName: item.name,
          optionName: option?.optionName ?? null,
          label: option ? `${item.name} - ${option.optionName}` : item.name,
          defaultPrice: modelPrice?.defaultPrice ?? 0,
          priceSource: modelPrice ? 'model_price' : 'manual_price',
        };
      });
    });
}

function normalizeText(value: string | null | undefined): string {
  const normalized = (value ?? '')
    .toLowerCase()
    .replaceAll('ə', 'e')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('nozzle', 'iyne')
    .replaceAll('klapan', 'qapaq')
    .replaceAll('valf', 'qapaq')
    .replaceAll('china', 'cin')
    .replaceAll('original', 'original')
    .replaceAll('taxildi', 'sokulme')
    .replaceAll('cixarildi', 'sokulme')
    .replaceAll('sokuldu', 'sokulme')
    .replaceAll('sokulub', 'sokulme')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return normalized
    .split(' ')
    .filter((part) => part !== 'yeni')
    .join(' ');
}

function findBestDetailRow(
  rows: DetailRow[],
  name: string,
  optionName: string | null,
  itemType: 'labor' | 'part' | null,
): DetailRow | null {
  const normalizedName = normalizeText(name);
  const normalizedOption = normalizeText(optionName);
  const candidates = rows.filter((row) => !itemType || row.itemType === itemType);
  const exact = candidates.find((row) => (
    normalizeText(row.itemName) === normalizedName
    && (!normalizedOption || normalizeText(row.optionName) === normalizedOption)
  ));

  if (exact) {
    return exact;
  }

  const scored = candidates
    .map((row) => {
    const item = normalizeText(row.itemName);
    const option = normalizeText(row.optionName);
    const label = normalizeText(row.label);
      const combined = `${normalizedName} ${normalizedOption}`.trim();
      let score = 0;

      if (item === normalizedName) {
        score += 50;
      } else if (combined.includes(item) || label.includes(normalizedName)) {
        score += 20;
      }

      if (option) {
        if (option === normalizedOption) {
          score += 45;
        } else if (combined.includes(option) || optionIncludesEveryWord(option, combined)) {
          score += 35;
        }
      }

      if (!option && !normalizedOption && item === normalizedName) {
        score += 10;
      }

      return { row, score };
    })
    .filter((candidate) => candidate.score >= 20)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.row ?? null;
}

function optionIncludesEveryWord(option: string, value: string): boolean {
  const optionWords = option.split(' ').filter(Boolean);

  return optionWords.length > 0 && optionWords.every((word) => value.includes(word));
}

function normalizeInjectorNumbers(numbers: number[], count: number): number[] {
  const normalized = numbers.filter((number) => number >= 1 && number <= count);

  if (normalized.length === 0) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  return [...new Set(normalized)];
}

function buildProblemMap(aiResult: AiFillNewServiceResponse, count: number): Map<number, { problems: string[]; note: string }> {
  const result = new Map<number, { problems: string[]; note: string }>();

  aiResult.injectorProblems.forEach((entry) => {
    const injectorNumbers = normalizeInjectorNumbers(entry.injectorNumbers, count);
    const problems = entry.problems
      .map((problem) => matchProblem(problem))
      .filter((problem): problem is string => Boolean(problem));

    injectorNumbers.forEach((injectorNumber) => {
      const current = result.get(injectorNumber) ?? { problems: [], note: '' };
      result.set(injectorNumber, {
        problems: [...new Set([...current.problems, ...problems])],
        note: [current.note, entry.note?.trim()].filter(Boolean).join('\n'),
      });
    });
  });

  return result;
}

function matchProblem(value: string): string | null {
  const normalizedValue = normalizeText(value);

  return knownProblems.find((problem) => (
    normalizeText(problem) === normalizedValue
    || normalizeText(problem).includes(normalizedValue)
    || normalizedValue.includes(normalizeText(problem))
  )) ?? null;
}

function dedupeLineItems(lineItems: NewServiceLineItemDraft[]): NewServiceLineItemDraft[] {
  const byId = new Map<string, NewServiceLineItemDraft>();
  lineItems.forEach((lineItem) => {
    byId.set(lineItem.id, lineItem);
  });
  return [...byId.values()];
}

function safeKey(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom';
}
