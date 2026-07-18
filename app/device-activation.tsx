import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import {
  checkDeviceApproval,
  getOrCreateDeviceId,
  type DeviceApprovalState,
} from '../src/services/deviceApproval';

type DeviceActivationParams = {
  state?: string;
  deviceId?: string;
  message?: string;
};

function getInitialState(value: string | undefined): Exclude<DeviceApprovalState, 'loading' | 'approved'> {
  if (value === 'deactivated' || value === 'error') {
    return value;
  }

  return 'pending';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return 'Yenidən yoxlayın.';
}

export default function DeviceActivationScreen() {
  const params = useLocalSearchParams<DeviceActivationParams>();
  const [screenState, setScreenState] = useState(getInitialState(params.state));
  const [deviceId, setDeviceId] = useState(params.deviceId ?? '');
  const [message, setMessage] = useState(params.message);
  const [isChecking, setIsChecking] = useState(false);

  const isDeactivated = screenState === 'deactivated';
  const isError = screenState === 'error';
  const title = isDeactivated ? '' : 'Cihaz aktiv deyil';

  const body = useMemo(() => {
    if (isDeactivated) {
      return ['Bu cihazın girişi bağlanıb.', 'Sahibkarla əlaqə saxlayın.'];
    }

    if (isError) {
      return ['Cihaz yoxlanıla bilmədi.', message ?? 'Yenidən yoxlayın.'];
    }

    return ['Bu cihaz sistemə əlavə edilməyib.', 'Cihaz kodunu sahibkara göndərin.'];
  }, [isDeactivated, isError, message]);

  const checkApproval = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setIsChecking(true);
    }

    setMessage(undefined);

    try {
      const result = await checkDeviceApproval();

      if (result.state === 'approved') {
        router.replace('/search');
        return;
      }

      setScreenState(result.state === 'deactivated' ? 'deactivated' : 'pending');
      setDeviceId(result.deviceId);
    } catch (error) {
      setScreenState('error');
      setMessage(getErrorMessage(error));

      if (!deviceId) {
        try {
          setDeviceId(await getOrCreateDeviceId());
        } catch {
          setDeviceId('');
        }
      }
    } finally {
      if (showLoading) {
        setIsChecking(false);
      }
    }
  }, [deviceId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      checkApproval(false);
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [checkApproval]);

  async function handleRecheck() {
    await checkApproval(true);
  }

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      <View style={styles.body}>
        {body.map((line) => (
          <Text key={line} style={styles.text}>
            {line}
          </Text>
        ))}
      </View>

      {!isDeactivated && deviceId ? (
        <View style={styles.codeBlock}>
          <Text style={styles.label}>Cihaz kodu:</Text>
          <Text style={styles.code}>{deviceId}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isChecking}
        onPress={handleRecheck}
        style={({ pressed }) => [
          styles.button,
          (pressed || isChecking) && styles.buttonPressed,
        ]}
      >
        {isChecking ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Yenidən yoxla</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
    padding: 24,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    marginTop: 18,
    gap: 6,
  },
  text: {
    color: '#374151',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  codeBlock: {
    alignItems: 'center',
    marginTop: 28,
  },
  label: {
    color: '#6B7280',
    fontSize: 14,
  },
  code: {
    marginTop: 8,
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 180,
    marginTop: 32,
    borderRadius: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 22,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
