import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useCampo } from '../contexts/CampoContext';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingCampoScreen } from '../screens/OnboardingCampoScreen';
import { MapScreen } from '../screens/MapScreen';
import { PaddockDetailScreen } from '../screens/PaddockDetailScreen';
import { NewGrazingScreen } from '../screens/NewGrazingScreen';
import { HerdsScreen } from '../screens/HerdsScreen';
import { RecordsScreen } from '../screens/RecordsScreen';
import { ClimateScreen } from '../screens/ClimateScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { activeCampo, campos, loading: campoLoading } = useCampo();

  if (authLoading || (user && campoLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name={'Map' as never} component={LoginScreen as never} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (campos.length === 0 || !activeCampo) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name={'Map' as never} component={OnboardingCampoScreen as never} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PaddockDetail"
          component={PaddockDetailScreen}
          options={{ title: 'Potrero' }}
        />
        <Stack.Screen
          name="NewGrazing"
          component={NewGrazingScreen}
          options={{ title: 'Nuevo pastoreo' }}
        />
        <Stack.Screen
          name="Herds"
          component={HerdsScreen}
          options={{ title: 'Rebaños' }}
        />
        <Stack.Screen
          name="Records"
          component={RecordsScreen}
          options={{ title: 'Pastoreos' }}
        />
        <Stack.Screen
          name="Climate"
          component={ClimateScreen}
          options={{ title: 'Clima' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Ajustes' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
