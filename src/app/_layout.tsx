import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { StoreProvider } from '../store/StoreProvider';
import { useColors } from '../ui/theme';

/** En la versión web, el service worker guarda la app para abrirla sin cobertura. */
function useOfflineWeb() {
  useEffect(() => {
    if (Platform.OS !== 'web' || __DEV__ || !('serviceWorker' in navigator)) return;
    const base = process.env.EXPO_BASE_URL ?? '';
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
      // Sin service worker la app sigue funcionando con conexión.
    });
  }, []);
}

export default function RootLayout() {
  const c = useColors();
  useOfflineWeb();
  return (
    <StoreProvider
      fallback={
        <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      }
    >
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Taller' }} />
        <Stack.Screen name="tarea/[id]" options={{ title: 'Tarea' }} />
        <Stack.Screen name="pares" options={{ title: 'Pares de apriete' }} />
        <Stack.Screen name="copia" options={{ title: 'Copia de seguridad' }} />
      </Stack>
    </StoreProvider>
  );
}
