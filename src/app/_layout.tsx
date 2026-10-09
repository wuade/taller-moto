import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoreProvider } from '../store/StoreProvider';
import { Button } from '../ui/components';
import { useColors } from '../ui/theme';

/**
 * En la versión web, el service worker guarda la app para abrirla sin cobertura.
 * Devuelve true cuando se ha descargado una versión nueva y basta con recargar para usarla.
 */
function useOfflineWeb(): boolean {
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || __DEV__ || !('serviceWorker' in navigator)) return;
    const base = process.env.EXPO_BASE_URL ?? '';
    // La primera vez no había service worker: su llegada no es una versión nueva.
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
    };
    // El iPhone no vuelve a cargar la app al volver a ella, así que solo buscaría versión nueva al
    // cerrarla del todo. Se busca cada vez que la app vuelve a la pantalla.
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => registration?.update())
        .catch(() => {});
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
      // Sin service worker la app sigue funcionando con conexión.
    });
    // Pide que el navegador no borre los datos guardados cuando le falte espacio.
    navigator.storage?.persist?.().catch(() => {});
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
  return updateReady;
}

function UpdateBar() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.updateBar, { backgroundColor: c.surface, borderColor: c.line, bottom: 12 + insets.bottom }]}
    >
      <Text style={{ color: c.ink, fontSize: 15, flex: 1 }}>Hay una versión nueva de la app.</Text>
      <Button small label="Actualizar" onPress={() => window.location.reload()} />
    </View>
  );
}

export default function RootLayout() {
  const c = useColors();
  const updateReady = useOfflineWeb();
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
        <Stack.Screen name="avisos" options={{ title: 'Avisos' }} />
        <Stack.Screen name="copia" options={{ title: 'Copia de seguridad' }} />
      </Stack>
      {updateReady ? <UpdateBar /> : null}
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  updateBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
});
