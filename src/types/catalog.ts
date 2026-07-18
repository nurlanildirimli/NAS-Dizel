export type PriceItemType = 'labor' | 'part' | 'extra';

export type InjectorModel = {
  id: string;
  company: string;
  code: string;
  name: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PriceItemOption = {
  id: string;
  priceItemId: string;
  optionName: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PriceItem = {
  id: string;
  name: string;
  type: PriceItemType;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  options: PriceItemOption[];
};

export type InjectorModelPrice = {
  id: string;
  injectorModelId: string;
  priceItemId: string;
  priceItemOptionId: string | null;
  itemType: PriceItemType;
  defaultPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PriceCatalog = {
  labor: PriceItem[];
  parts: PriceItem[];
  extras: PriceItem[];
};

export type InjectorModelInput = {
  company: string;
  code: string;
  name?: string;
  note?: string;
  isActive?: boolean;
};

export type PriceItemInput = {
  name: string;
  type: PriceItemType;
};

export type ModelPriceInput = {
  injectorModelId: string;
  priceItemId: string;
  priceItemOptionId?: string | null;
  itemType: PriceItemType;
  defaultPrice: number;
};
