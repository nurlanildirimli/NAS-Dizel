import { type ProfessionalServiceNoteResponse } from '../schemas/professionalServiceNote';
import { type InjectorModelPrice, type PriceCatalog } from '../types/catalog';
import { type NewServiceLineItemDraft, type ServicePriceLineDraft } from '../types/newService';

type CatalogRow = {
  priceItemId: string;
  priceItemOptionId: string | null;
  itemName: string;
  optionName: string | null;
  itemType: 'labor' | 'part' | 'extra';
  label: string;
  defaultPrice: number;
};

export type ProfessionalNotePricingResult = {
  priceLines: ServicePriceLineDraft[];
  priceTotal: number;
  warnings: string[];
};

export function buildProfessionalNotePriceSuggestion(
  result: ProfessionalServiceNoteResponse,
  catalog: PriceCatalog,
  modelPrices: InjectorModelPrice[],
): ProfessionalNotePricingResult {
  const rows = buildCatalogRows(catalog, modelPrices);
  const warnings: string[] = [];
  const catalogLines = result.detectedOperations
    .map((operation, index) => {
    const matchedRow = findBestCatalogRow(rows, operation.name, operation.itemType);
    const quantity = resolveQuantity(operation, result.injector.count);
    const scope = resolveScope(operation, result.injector.count);
    const applyTarget = resolveApplyTarget(operation);
    const selectedInjectorNumbers = applyTarget === 'all_injectors' || applyTarget === 'general_service'
      ? []
      : operation.injectorNumbers;

    if (operation.statedPrice !== null && operation.statedPrice > 0) {
      const itemType = matchedRow?.itemType ?? normalizeItemType(operation.itemType);
      const amount = operation.statedPrice;

      return {
        name: matchedRow?.label ?? operation.name,
        amount,
        source: 'spoken' as const,
        scope,
        sourceText: operation.sourceText,
        lineItem: createLineItem({
          id: `ai-detail-${index}`,
          itemType,
          itemName: matchedRow?.itemName ?? fallbackOperationName(operation.name, index),
          optionName: matchedRow?.optionName ?? null,
          applyTarget,
          selectedInjectorNumbers,
          quantity,
          defaultUnitPrice: matchedRow?.defaultPrice ?? 0,
          amount,
          priceSource: 'manual_price',
          note: operation.sourceText,
        }),
      };
    }

    if (!matchedRow) {
      warnings.push(`Kataloqda tapılmadı: ${operation.name}`);
      const line: ServicePriceLineDraft = {
        name: operation.name || `AI detal ${index + 1}`,
        amount: 0,
        source: 'unmatched' as const,
        scope,
        sourceText: operation.sourceText,
      };

      return line;
    }

    if (matchedRow.defaultPrice <= 0) {
      warnings.push(`Qiymət tapılmadı: ${matchedRow.label}`);
    }

    const amount = matchedRow.defaultPrice * quantity;

    return {
      name: matchedRow.label,
      amount,
      source: matchedRow.defaultPrice > 0 ? 'catalog' as const : 'unmatched' as const,
      scope,
      sourceText: operation.sourceText,
      lineItem: matchedRow.defaultPrice > 0
        ? createLineItem({
          id: `ai-detail-${index}`,
          itemType: matchedRow.itemType,
          itemName: matchedRow.itemName,
          optionName: matchedRow.optionName,
          applyTarget,
          selectedInjectorNumbers,
          quantity,
          defaultUnitPrice: matchedRow.defaultPrice,
          amount,
          priceSource: 'model_price',
          note: operation.sourceText,
        })
        : undefined,
    };
  });

  const hasSpokenTotal = result.priceTotalSource !== 'none' && result.priceTotal > 0;
  const catalogTotal = sumLines(catalogLines);

  if (hasSpokenTotal) {
    if (catalogTotal > 0 && Math.abs(catalogTotal - result.priceTotal) >= 0.01) {
      warnings.push(
        `AI qiymət cəmi (${formatAmount(result.priceTotal)} AZN) kataloq hesabından (${formatAmount(catalogTotal)} AZN) fərqlidir. Mexanikin dediyi qiymət tətbiq edildi.`,
      );
    }

    return {
      priceLines: catalogLines.some((line) => line.lineItem)
        ? catalogLines
        : normalizeSpokenLines(result.priceLines),
      priceTotal: result.priceTotal,
      warnings,
    };
  }

  return {
    priceLines: catalogLines,
    priceTotal: catalogTotal,
    warnings,
  };
}

function buildCatalogRows(catalog: PriceCatalog, modelPrices: InjectorModelPrice[]): CatalogRow[] {
  return [...catalog.labor, ...catalog.parts, ...catalog.extras]
    .filter((item) => item.name !== 'Digər')
    .flatMap((item) => {
      const options = item.options.length > 0 ? item.options : [null];

      return options.map((option) => {
        const modelPrice = modelPrices.find((price) => (
          price.priceItemId === item.id
          && price.priceItemOptionId === (option?.id ?? null)
        ));

        return {
          itemName: item.name,
          optionName: option?.optionName ?? null,
          itemType: item.type,
          priceItemId: item.id,
          priceItemOptionId: option?.id ?? null,
          label: option ? `${item.name} - ${option.optionName}` : item.name,
          defaultPrice: modelPrice?.defaultPrice ?? 0,
        };
      });
    });
}

function findBestCatalogRow(
  rows: CatalogRow[],
  name: string,
  itemType: ProfessionalServiceNoteResponse['detectedOperations'][number]['itemType'],
): CatalogRow | null {
  const normalizedName = normalizeText(name);
  const candidates = rows.filter((row) => (
    !itemType
    || itemType === 'unknown'
    || row.itemType === itemType
  ));

  const exact = candidates.find((row) => (
    normalizeText(row.itemName) === normalizedName
    || normalizeText(row.optionName) === normalizedName
    || normalizeText(row.label) === normalizedName
  ));

  if (exact) {
    return exact;
  }

  const scored = candidates
    .map((row) => {
      const item = normalizeText(row.itemName);
      const option = normalizeText(row.optionName);
      const label = normalizeText(row.label);
      let score = 0;

      if (normalizedName.includes(item) || item.includes(normalizedName)) {
        score += 25;
      }

      if (option && (normalizedName.includes(option) || optionIncludesEveryWord(option, normalizedName))) {
        score += 35;
      }

      if (label.includes(normalizedName) || normalizedName.includes(label)) {
        score += 20;
      }

      return { row, score };
    })
    .filter((candidate) => candidate.score >= 20)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.row ?? null;
}

function resolveQuantity(
  operation: ProfessionalServiceNoteResponse['detectedOperations'][number],
  injectorCount: number | null,
): number {
  if (operation.quantity !== null && operation.quantity > 0) {
    return operation.quantity;
  }

  if (operation.injectorNumbers.length > 0) {
    return operation.injectorNumbers.length;
  }

  if (operation.appliesToAllInjectors && injectorCount) {
    return injectorCount;
  }

  return 1;
}

function resolveScope(
  operation: ProfessionalServiceNoteResponse['detectedOperations'][number],
  injectorCount: number | null,
) {
  if (operation.injectorNumbers.length > 0) {
    return `Injector ${operation.injectorNumbers.join(', ')}`;
  }

  if (operation.appliesToAllInjectors) {
    return injectorCount ? `Bütün injectorlar (${injectorCount})` : 'Bütün injectorlar';
  }

  return 'Ümumi xidmət';
}

function resolveApplyTarget(
  operation: ProfessionalServiceNoteResponse['detectedOperations'][number],
): NewServiceLineItemDraft['applyTarget'] {
  if (operation.appliesToAllInjectors) {
    return 'all_injectors';
  }

  if (operation.injectorNumbers.length === 1) {
    return 'single_injector';
  }

  if (operation.injectorNumbers.length > 1) {
    return 'selected_injectors';
  }

  return 'general_service';
}

function normalizeItemType(
  itemType: ProfessionalServiceNoteResponse['detectedOperations'][number]['itemType'],
): NewServiceLineItemDraft['itemType'] {
  if (itemType === 'labor' || itemType === 'part' || itemType === 'extra') {
    return itemType;
  }

  return 'extra';
}

function createLineItem({
  id,
  itemType,
  itemName,
  optionName,
  applyTarget,
  selectedInjectorNumbers,
  quantity,
  defaultUnitPrice,
  amount,
  priceSource,
  note,
}: {
  id: string;
  itemType: NewServiceLineItemDraft['itemType'];
  itemName: string;
  optionName: string | null;
  applyTarget: NewServiceLineItemDraft['applyTarget'];
  selectedInjectorNumbers: number[];
  quantity: number;
  defaultUnitPrice: number;
  amount: number;
  priceSource: NewServiceLineItemDraft['priceSource'];
  note: string;
}): NewServiceLineItemDraft {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const unitPrice = safeQuantity > 0 ? amount / safeQuantity : amount;

  return {
    id,
    itemType,
    itemName,
    optionName,
    applyTarget,
    selectedInjectorNumbers,
    quantity: String(safeQuantity),
    defaultUnitPrice: String(defaultUnitPrice),
    actualUnitPrice: String(roundMoney(unitPrice)),
    priceSource,
    note,
  };
}

function normalizeSpokenLines(lines: ProfessionalServiceNoteResponse['priceLines']): ServicePriceLineDraft[] {
  return lines.map((line) => ({
    name: line.name,
    amount: line.amount,
    source: line.source ?? 'spoken',
    scope: line.scope,
  }));
}

function fallbackOperationName(name: string, index: number) {
  return name.trim() || `AI detal ${index + 1}`;
}

function sumLines(lines: ServicePriceLineDraft[]) {
  return lines.reduce((total, line) => total + line.amount, 0);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replaceAll('ə', 'e')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('farsonka', 'injector')
    .replaceAll('farsunka', 'injector')
    .replaceAll('forsunka', 'injector')
    .replaceAll('nozzle', 'iyne')
    .replaceAll('klapan', 'qapaq')
    .replaceAll('valf', 'qapaq')
    .replaceAll('sayba', 'sayba')
    .replaceAll('şayba', 'sayba')
    .replaceAll('china', 'cin')
    .replaceAll('taxildi', 'sokulme')
    .replaceAll('cixarildi', 'sokulme')
    .replaceAll('sokuldu', 'sokulme')
    .replaceAll('sokduk', 'sokulme')
    .replaceAll('sokulub', 'sokulme')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((part) => part && part !== 'yeni')
    .join(' ')
    .trim();
}

function optionIncludesEveryWord(option: string, value: string): boolean {
  const optionWords = option.split(' ').filter(Boolean);
  return optionWords.length > 0 && optionWords.every((word) => value.includes(word));
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
