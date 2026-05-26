import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { CampoProvider } from './src/contexts/CampoContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getDb } from './src/lib/sqlite';
import { startSyncWorker, stopSyncWorker } from './src/lib/sync';

export default function App() {
  // Bootstrap: abrir DB y arrancar worker de sync.
  useEffect(() => {
    getDb().catch((e) => console.error('No se pudo abrir SQLite:', e));
    startSyncWorker();
    return () => stopSyncWorker();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CampoProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </CampoProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
