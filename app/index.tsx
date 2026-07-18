import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { checkDeviceApproval } from '../src/services/deviceApproval';

export default function DeviceGateScreen() {
  useEffect(() => {
    let isMounted = true;

    async function checkDevice() {
      try {
        const result = await checkDeviceApproval();

        if (!isMounted) {
          return;
        }

        if (result.state === 'approved') {
          router.replace('/search');
          return;
        }

        router.replace({
          pathname: '/device-activation',
          params: {
            state: result.state,
            deviceId: result.deviceId,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (!isMounted) {
          return;
        }

        router.replace({
          pathname: '/device-activation',
          params: {
            state: 'error',
            message,
          },
        });
      }
    }

    checkDevice();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#111827" />
      <Text style={styles.subtitle}>NAS Dizel</Text>
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
  subtitle: {
    marginTop: 12,
    color: '#4B5563',
    fontSize: 16,
  },
});
