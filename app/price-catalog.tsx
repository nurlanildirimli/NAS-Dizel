import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Wrench } from 'lucide-react-native';

import { Header, PagePanel, Screen, StepHeader } from '../src/components/layout';
import { OptionSelector } from '../src/components/forms';
import { Button, Card, Input, Modal } from '../src/components/ui';
import {
  createInjectorModel,
  createPriceItem,
  getInjectorModels,
  getModelPrices,
  getPriceCatalog,
  softDeletePriceItem,
  updateInjectorModel,
  updatePriceItem,
  upsertModelPrice,
} from '../src/services/catalog';
import { colors, spacing } from '../src/theme';
import { type InjectorModel, type PriceItem, type PriceItemType } from '../src/types/catalog';
import { formatMoney } from '../src/utils/formatMoney';

type ModelForm = {
  id: string | null;
  company: string;
  code: string;
  name: string;
  note: string;
};

type CatalogPriceRow = {
  key: string;
  label: string;
  priceItemId: string;
  priceItemOptionId: string | null;
  itemType: PriceItemType;
};

type DetailForm = {
  id: string | null;
  name: string;
  type: PriceItemType;
};

const detailTypeLabels = ['İş', 'Hissə', 'Əlavə'] as const;

const emptyDetailForm: DetailForm = {
  id: null,
  name: '',
  type: 'part',
};

const emptyModelForm: ModelForm = {
  id: null,
  company: '',
  code: '',
  name: '',
  note: '',
};

export default function PriceCatalogScreen() {
  const queryClient = useQueryClient();
  const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm);
  const [selectedModel, setSelectedModel] = useState<InjectorModel | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [detailForm, setDetailForm] = useState<DetailForm | null>(null);
  const [deleteItem, setDeleteItem] = useState<PriceItem | null>(null);

  const catalogQuery = useQuery({
    queryKey: ['catalog', 'items'],
    queryFn: getPriceCatalog,
  });
  const modelsQuery = useQuery({
    queryKey: ['catalog', 'injector-models'],
    queryFn: () => getInjectorModels(),
  });
  const pricesQuery = useQuery({
    queryKey: ['catalog', 'model-prices', selectedModel?.id],
    queryFn: () => getModelPrices(selectedModel?.id ?? ''),
    enabled: Boolean(selectedModel?.id),
  });
  const saveModelMutation = useMutation({
    mutationFn: () => (
      modelForm.id
        ? updateInjectorModel({ ...modelForm, id: modelForm.id })
        : createInjectorModel(modelForm)
    ),
    onSuccess: (model) => {
      setSelectedModel(model);
      setModelForm(mapModelToForm(model));
      queryClient.invalidateQueries({ queryKey: ['catalog', 'injector-models'] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'injector-model'] });
    },
  });
  const savePriceMutation = useMutation({
    mutationFn: upsertModelPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog', 'model-prices', selectedModel?.id] });
    },
  });
  const saveDetailMutation = useMutation({
    mutationFn: (form: DetailForm) => (
      form.id
        ? updatePriceItem({ id: form.id, name: form.name, type: form.type })
        : createPriceItem({ name: form.name, type: form.type })
    ),
    onSuccess: () => {
      setDetailForm(null);
      queryClient.invalidateQueries({ queryKey: ['catalog', 'items'] });
    },
  });
  const deleteDetailMutation = useMutation({
    mutationFn: softDeletePriceItem,
    onSuccess: () => {
      setDeleteItem(null);
      queryClient.invalidateQueries({ queryKey: ['catalog', 'items'] });
    },
  });

  const catalog = catalogQuery.data;
  const currentPrices = pricesQuery.data ?? [];
  const detailItems = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return [...catalog.labor, ...catalog.parts, ...catalog.extras];
  }, [catalog]);
  const priceRows = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return [
      ...buildPriceRows(catalog.labor),
      ...buildPriceRows(catalog.parts),
      ...buildPriceRows(catalog.extras),
    ];
  }, [catalog]);

  function selectModel(model: InjectorModel) {
    setSelectedModel(model);
    setModelForm(mapModelToForm(model));
    setPriceDrafts({});
  }

  function updatePriceDraft(key: string, value: string) {
    setPriceDrafts((current) => ({ ...current, [key]: value }));
  }

  function getExistingPrice(priceItemId: string, priceItemOptionId: string | null) {
    return currentPrices.find((price) => (
      price.priceItemId === priceItemId
      && price.priceItemOptionId === priceItemOptionId
    ));
  }

  function openEditDetail(item: PriceItem) {
    setDetailForm({
      id: item.id,
      name: item.name,
      type: item.type,
    });
  }

  function handleSaveDetail() {
    if (!detailForm || !detailForm.name.trim()) {
      return;
    }

    saveDetailMutation.mutate(detailForm);
  }

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header
        title="Qiymət kataloqu"
        icon={Wrench}
        compact
        action={(
          <Button title="Əvvəlki" variant="secondary" size="compact" icon={ArrowLeft} onPress={() => router.back()} />
        )}
      />
      <PagePanel edgeToEdge compact fill>
        <View style={styles.content}>
          <Card>
            <StepHeader title="Injector modelləri" />
            <View style={styles.form}>
              <Input
                label="Injector şirkəti"
                onChangeText={(company) => setModelForm((current) => ({ ...current, company }))}
                required
                size="compact"
                value={modelForm.company}
              />
              <Input
                label="Injector kodu"
                onChangeText={(code) => setModelForm((current) => ({ ...current, code }))}
                required
                size="compact"
                value={modelForm.code}
              />
              <Input
                label="Model adı"
                onChangeText={(name) => setModelForm((current) => ({ ...current, name }))}
                size="compact"
                value={modelForm.name}
              />
              <Input
                label="Qeyd"
                onChangeText={(note) => setModelForm((current) => ({ ...current, note }))}
                size="compact"
                value={modelForm.note}
              />
              <View style={styles.actions}>
                <Button
                  disabled={saveModelMutation.isPending || !modelForm.company.trim() || !modelForm.code.trim()}
                  title={modelForm.id ? 'Yadda saxla' : 'Əlavə et'}
                  onPress={() => saveModelMutation.mutate()}
                  style={styles.actionButton}
                />
                <Button
                  title="Yeni qeyd yarat"
                  variant="secondary"
                  onPress={() => {
                    setModelForm(emptyModelForm);
                    setSelectedModel(null);
                    setPriceDrafts({});
                  }}
                  style={styles.actionButton}
                />
              </View>
            </View>

            {modelsQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {modelsQuery.data?.length === 0 ? <Text style={styles.empty}>Nəticə tapılmadı</Text> : null}
            <View style={styles.modelList}>
              {modelsQuery.data?.map((model) => (
                <View key={model.id} style={styles.modelRow}>
                  <View style={styles.modelTextBlock}>
                    <Text style={styles.modelTitle}>{model.company} {model.code}</Text>
                    {model.name ? <Text style={styles.mutedText}>{model.name}</Text> : null}
                  </View>
                  <Button title="Redaktə et" variant="secondary" onPress={() => selectModel(model)} />
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <StepHeader title="Detal" />
              <Button
                title="Əlavə et"
                size="compact"
                onPress={() => setDetailForm(emptyDetailForm)}
              />
            </View>
            {catalogQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {detailItems.length === 0 && !catalogQuery.isLoading ? <Text style={styles.empty}>Nəticə tapılmadı</Text> : null}
            <View style={styles.catalogList}>
              {detailItems.map((item) => (
                <View key={item.id} style={styles.catalogRow}>
                  <View style={styles.modelTextBlock}>
                    <Text style={styles.modelTitle}>{item.name}</Text>
                    <Text style={styles.mutedText}>{mapPriceItemTypeLabel(item.type)}</Text>
                    {item.options.length > 0 ? (
                      <Text style={styles.mutedText}>{item.options.map((option) => option.optionName).join(' · ')}</Text>
                    ) : null}
                  </View>
                  <View style={styles.rowActions}>
                    <Button
                      title="Redaktə et"
                      variant="secondary"
                      size="compact"
                      onPress={() => openEditDetail(item)}
                      style={styles.rowAction}
                    />
                    <Button
                      title="Sil"
                      variant="danger"
                      size="compact"
                      onPress={() => setDeleteItem(item)}
                      style={styles.rowAction}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {selectedModel ? (
            <Card>
              <StepHeader title={`${selectedModel.company} ${selectedModel.code}`} />
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>Bu dəyişiklik yalnız yeni xidmətlərə tətbiq olunacaq.</Text>
                <Text style={styles.warningText}>Əvvəlki xidmətlərin qiymətləri dəyişməyəcək.</Text>
              </View>
              {pricesQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
              <View style={styles.priceRows}>
                {priceRows.map((row) => {
                  const existingPrice = getExistingPrice(row.priceItemId, row.priceItemOptionId);
                  const draftValue = priceDrafts[row.key] ?? String(existingPrice?.defaultPrice ?? '');
                  return (
                    <View key={row.key} style={styles.priceRow}>
                      <View style={styles.modelTextBlock}>
                        <Text style={styles.modelTitle}>{row.label}</Text>
                        <Text style={styles.mutedText}>{existingPrice ? formatMoney(existingPrice.defaultPrice) : formatMoney(0)}</Text>
                      </View>
                      <Input
                        keyboardType="numeric"
                        label="Qiymət"
                        onChangeText={(value) => updatePriceDraft(row.key, value)}
                        size="compact"
                        value={draftValue}
                      />
                      <Button
                        disabled={savePriceMutation.isPending}
                        title="Yadda saxla"
                        onPress={() => savePriceMutation.mutate({
                          injectorModelId: selectedModel.id,
                          priceItemId: row.priceItemId,
                          priceItemOptionId: row.priceItemOptionId,
                          itemType: row.itemType,
                          defaultPrice: Number(draftValue || 0),
                        })}
                      />
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}
        </View>
      </PagePanel>
      <Modal
        cancelLabel="Bağla"
        confirmLabel="Yadda saxla"
        onCancel={() => setDetailForm(null)}
        onConfirm={handleSaveDetail}
        title={detailForm?.id ? 'Detal redaktə et' : 'Detal əlavə et'}
        visible={Boolean(detailForm)}
      >
        <View style={styles.form}>
          <Input
            label="Ad"
            onChangeText={(name) => setDetailForm((current) => (current ? { ...current, name } : current))}
            required
            size="compact"
            value={detailForm?.name ?? ''}
          />
          {!detailForm?.id ? (
            <OptionSelector
              label="Tip"
              onChange={(label) => setDetailForm((current) => (
                current ? { ...current, type: mapPriceItemType(label) } : current
              ))}
              options={detailTypeLabels}
              required
              value={mapPriceItemTypeLabel(detailForm?.type ?? 'part')}
            />
          ) : (
            <Text style={styles.mutedText}>Tip: {mapPriceItemTypeLabel(detailForm?.type ?? 'part')}</Text>
          )}
          {saveDetailMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
      </Modal>
      <Modal
        cancelLabel="Bağla"
        confirmLabel="Sil"
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => {
          if (deleteItem) {
            deleteDetailMutation.mutate(deleteItem.id);
          }
        }}
        title="Detal sil"
        visible={Boolean(deleteItem)}
      >
        <Text style={styles.warningText}>Bu detalı silmək istəyirsiniz?</Text>
        {deleteItem ? <Text style={styles.modelTitle}>{deleteItem.name}</Text> : null}
        <Text style={styles.mutedText}>Əvvəlki xidmətlər dəyişməyəcək.</Text>
        {deleteDetailMutation.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      </Modal>
    </Screen>
  );
}

function mapModelToForm(model: InjectorModel): ModelForm {
  return {
    id: model.id,
    company: model.company,
    code: model.code,
    name: model.name ?? '',
    note: model.note ?? '',
  };
}

function mapPriceItemTypeLabel(type: PriceItemType): typeof detailTypeLabels[number] {
  if (type === 'labor') {
    return 'İş';
  }

  if (type === 'extra') {
    return 'Əlavə';
  }

  return 'Hissə';
}

function mapPriceItemType(label: typeof detailTypeLabels[number]): PriceItemType {
  if (label === 'İş') {
    return 'labor';
  }

  if (label === 'Əlavə') {
    return 'extra';
  }

  return 'part';
}

function buildPriceRows(items: PriceItem[]): CatalogPriceRow[] {
  return items.reduce<CatalogPriceRow[]>((rows, item) => {
    if (item.options.length === 0) {
      rows.push({
        key: item.id,
        label: item.name,
        priceItemId: item.id,
        priceItemOptionId: null,
        itemType: item.type,
      });
      return rows;
    }

    rows.push(...item.options.map((option) => ({
      key: option.id,
      label: `${item.name} — ${option.optionName}`,
      priceItemId: item.id,
      priceItemOptionId: option.id,
      itemType: item.type as PriceItemType,
    })));

    return rows;
  }, []);
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 160,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  modelList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  modelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  modelTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  modelTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  catalogList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  catalogRow: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  rowAction: {
    minWidth: 92,
  },
  warningBox: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    backgroundColor: colors.warningSoft,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  warningText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  priceRows: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  priceRow: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
});
