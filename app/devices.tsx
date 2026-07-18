import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Smartphone } from 'lucide-react-native';

import { Header, PagePanel, Screen, StepHeader } from '../src/components/layout';
import { Badge, Button, Card, FilterPill, Input, Modal } from '../src/components/ui';
import {
  activateDevice,
  deactivateDevice,
  listAllowedDevices,
  softDeleteDevice,
  updateDeviceDetails,
} from '../src/services/devices';
import { colors, spacing } from '../src/theme';
import { type AllowedDevice, type DeviceFilterKey } from '../src/types/devices';
import { formatDate } from '../src/utils/formatDate';

const filters: Array<{ label: string; key: DeviceFilterKey }> = [
  { label: 'Aktiv', key: 'active' },
  { label: 'Gözləmədə', key: 'pending' },
  { label: 'Deaktiv', key: 'deactivated' },
  { label: 'Silinmiş', key: 'deleted' },
  { label: 'Hamısı', key: 'all' },
];

type ConfirmAction = 'activate' | 'deactivate' | 'delete';

type ConfirmState = {
  action: ConfirmAction;
  device: AllowedDevice;
} | null;

export default function DevicesScreen() {
  const queryClient = useQueryClient();
  const [filterKey, setFilterKey] = useState<DeviceFilterKey>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [note, setNote] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const devicesQuery = useQuery({
    queryKey: ['devices', filterKey],
    queryFn: () => listAllowedDevices(filterKey),
  });

  const refreshDevices = () => {
    queryClient.invalidateQueries({ queryKey: ['devices'] });
  };

  const activateMutation = useMutation({
    mutationFn: (device: AllowedDevice) => activateDevice(device.id, device.note ?? undefined),
    onSuccess: () => {
      setConfirmState(null);
      refreshDevices();
    },
  });
  const deactivateMutation = useMutation({
    mutationFn: (device: AllowedDevice) => deactivateDevice(device.id, device.note ?? undefined),
    onSuccess: () => {
      setConfirmState(null);
      refreshDevices();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (device: AllowedDevice) => softDeleteDevice(device.id),
    onSuccess: () => {
      setConfirmState(null);
      refreshDevices();
    },
  });
  const updateMutation = useMutation({
    mutationFn: updateDeviceDetails,
    onSuccess: () => {
      setEditingId(null);
      refreshDevices();
    },
  });

  function startEditing(device: AllowedDevice) {
    setEditingId(device.id);
    setDeviceName(device.deviceName ?? '');
    setNote(device.note ?? '');
  }

  function saveDeviceDetails(device: AllowedDevice) {
    updateMutation.mutate({
      id: device.id,
      deviceName,
      note,
    });
  }

  function confirmAction() {
    if (!confirmState) {
      return;
    }

    if (confirmState.action === 'activate') {
      activateMutation.mutate(confirmState.device);
    } else if (confirmState.action === 'deactivate') {
      deactivateMutation.mutate(confirmState.device);
    } else {
      deleteMutation.mutate(confirmState.device);
    }
  }

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header
        title="Cihazlar"
        icon={Smartphone}
        compact
        action={(
          <Button title="Əvvəlki" variant="secondary" size="compact" icon={ArrowLeft} onPress={() => router.back()} />
        )}
      />
      <PagePanel edgeToEdge compact fill>
        <View style={styles.content}>
          <Card>
            <StepHeader title="Cihazlar" />
            <View style={styles.pills}>
              {filters.map((filter) => (
                <FilterPill
                  active={filter.key === filterKey}
                  key={filter.key}
                  label={filter.label}
                  onPress={() => setFilterKey(filter.key)}
                  size="compact"
                />
              ))}
            </View>
          </Card>

          {devicesQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {devicesQuery.isError ? (
            <Card>
              <View style={styles.state}>
                <Text style={styles.title}>Məlumat yüklənmədi</Text>
                <Button title="Yenidən yoxla" onPress={() => devicesQuery.refetch()} />
              </View>
            </Card>
          ) : null}
          {devicesQuery.data?.length === 0 && !devicesQuery.isLoading ? (
            <Card>
              <View style={styles.state}>
                <Text style={styles.title}>Nəticə tapılmadı</Text>
              </View>
            </Card>
          ) : null}

          {devicesQuery.data?.map((device) => (
            <DeviceCard
              device={device}
              deviceName={deviceName}
              editing={editingId === device.id}
              key={device.id}
              note={note}
              onCancelEdit={() => setEditingId(null)}
              onChangeDeviceName={setDeviceName}
              onChangeNote={setNote}
              onConfirmAction={(action) => setConfirmState({ action, device })}
              onEdit={() => startEditing(device)}
              onSave={() => saveDeviceDetails(device)}
              saving={updateMutation.isPending}
            />
          ))}
        </View>

        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel={getConfirmLabel(confirmState?.action)}
          onCancel={() => setConfirmState(null)}
          onConfirm={confirmAction}
          title={getConfirmTitle(confirmState?.action)}
          visible={Boolean(confirmState)}
        >
          <Text style={styles.confirmText}>{confirmState?.device.deviceId}</Text>
        </Modal>
      </PagePanel>
    </Screen>
  );
}

type DeviceCardProps = {
  device: AllowedDevice;
  editing: boolean;
  deviceName: string;
  note: string;
  saving: boolean;
  onChangeDeviceName: (value: string) => void;
  onChangeNote: (value: string) => void;
  onCancelEdit: () => void;
  onConfirmAction: (action: ConfirmAction) => void;
  onEdit: () => void;
  onSave: () => void;
};

function DeviceCard({
  device,
  editing,
  deviceName,
  note,
  saving,
  onChangeDeviceName,
  onChangeNote,
  onCancelEdit,
  onConfirmAction,
  onEdit,
  onSave,
}: DeviceCardProps) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{device.deviceName || 'Cihaz adı'}</Text>
          <Text style={styles.code}>{device.deviceId}</Text>
        </View>
        <Badge label={getStatusLabel(device)} variant={getStatusVariant(device)} />
      </View>

      <View style={styles.metaGrid}>
        <Meta label="Cihaz kodu" value={device.deviceId} />
        <Meta label="Status" value={getStatusLabel(device)} />
        <Meta label="Son istifadə" value={formatDate(device.lastSeenAt)} />
        <Meta label="Yaradıldı" value={formatDate(device.createdAt)} />
      </View>

      {device.note ? <Text style={styles.note}>Qeyd: {device.note}</Text> : null}

      {editing ? (
        <View style={styles.editBox}>
          <Input label="Cihaz adı" value={deviceName} onChangeText={onChangeDeviceName} size="compact" />
          <Input
            label="Qeyd"
            multiline
            numberOfLines={3}
            size="compact"
            textAlignVertical="top"
            value={note}
            onChangeText={onChangeNote}
          />
          <View style={styles.actions}>
            <Button title="Əvvəlki" variant="secondary" onPress={onCancelEdit} style={styles.actionButton} />
            <Button disabled={saving} title="Yadda saxla" onPress={onSave} style={styles.actionButton} />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          {!device.isDeleted && device.status !== 'active' ? (
            <Button title="Aktiv et" onPress={() => onConfirmAction('activate')} style={styles.actionButton} />
          ) : null}
          {!device.isDeleted && device.status === 'active' ? (
            <Button
              title="Deaktiv et"
              variant="danger"
              onPress={() => onConfirmAction('deactivate')}
              style={styles.actionButton}
            />
          ) : null}
          {!device.isDeleted ? (
            <>
              <Button
                title="Cihaz adını dəyiş"
                variant="secondary"
                onPress={onEdit}
                style={styles.actionButton}
              />
              <Button
                title="Sil"
                variant="danger"
                onPress={() => onConfirmAction('delete')}
                style={styles.actionButton}
              />
            </>
          ) : null}
        </View>
      )}
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function getStatusLabel(device: AllowedDevice): string {
  if (device.isDeleted) {
    return 'Silinib';
  }

  if (device.status === 'active' && device.isActive) {
    return 'Aktiv';
  }

  if (device.status === 'pending') {
    return 'Gözləmədə';
  }

  return 'Deaktiv';
}

function getStatusVariant(device: AllowedDevice): 'normal' | 'partial' | 'unpaid' | 'neutral' {
  if (device.isDeleted) {
    return 'neutral';
  }

  if (device.status === 'active' && device.isActive) {
    return 'normal';
  }

  if (device.status === 'pending') {
    return 'partial';
  }

  return 'unpaid';
}

function getConfirmTitle(action?: ConfirmAction): string {
  if (action === 'activate') {
    return 'Bu cihazı aktiv etmək istəyirsiniz?';
  }

  if (action === 'deactivate') {
    return 'Bu cihazı deaktiv etmək istəyirsiniz?';
  }

  return 'Bu cihazı silmək istəyirsiniz?';
}

function getConfirmLabel(action?: ConfirmAction): string {
  if (action === 'activate') {
    return 'Aktiv et';
  }

  if (action === 'deactivate') {
    return 'Deaktiv et';
  }

  return 'Sil';
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  pills: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 120,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  code: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  metaItem: {
    minWidth: 140,
    flex: 1,
    gap: spacing.xs,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  metaValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  note: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  editBox: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flexGrow: 1,
  },
  confirmText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
});
