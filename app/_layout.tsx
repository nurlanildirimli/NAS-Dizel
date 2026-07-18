import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '../src/lib/queryClient';
import { startRealtimeInvalidation } from '../src/lib/realtimeInvalidation';
import { checkDeviceApproval } from '../src/services/deviceApproval';

function DeviceRouteGuard() {
  const pathname = usePathname();
  const [canRenderProtectedRoute, setCanRenderProtectedRoute] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const isActivationRoute = pathname === '/device-activation';

    async function checkDevice() {
      if (isActivationRoute) {
        if (isMounted) {
          setCanRenderProtectedRoute(true);
        }

        return;
      }

      try {
        const result = await checkDeviceApproval();

        if (!isMounted) {
          return;
        }

        if (result.state === 'approved') {
          setCanRenderProtectedRoute(true);
          return;
        }

        setCanRenderProtectedRoute(false);
        router.replace({
          pathname: '/device-activation',
          params: {
            state: result.state,
            deviceId: result.deviceId,
          },
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCanRenderProtectedRoute(false);
        router.replace({
          pathname: '/device-activation',
          params: {
            state: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    checkDevice();
    const intervalId = setInterval(checkDevice, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [pathname]);

  if (!canRenderProtectedRoute && pathname !== '/device-activation') {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color="#111827" />
        <Text style={styles.subtitle}>NAS Dizel</Text>
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  useEffect(() => startRealtimeInvalidation(queryClient), []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      <DeviceRouteGuard />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  gate: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
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
