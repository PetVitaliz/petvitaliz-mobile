import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const API_PORT = 3000;
const PRODUCTION_API_URL = 'https://petvitaliz-service-spring.onrender.com';

function hostOf(address: unknown): string | null {
  if (typeof address !== 'string' || !address) {
    return null;
  }
  const match = address.match(/^(?:[a-z+.-]+:\/\/)?([^/:]+)/i);
  return match ? match[1] : null;
}

function developmentHost(): string {
  if (Platform.OS === 'web') {
    return globalThis.location?.hostname || 'localhost';
  }
  return (
    hostOf(Constants.expoConfig?.hostUri) ??
    hostOf(Constants.linkingUri) ??
    hostOf(NativeModules?.SourceCode?.scriptURL) ??
    'localhost'
  );
}

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const defaultUrl = __DEV__ ? `http://${developmentHost()}:${API_PORT}` : PRODUCTION_API_URL;

export const API_URL = (configuredUrl || defaultUrl).replace(/\/+$/, '');

if (__DEV__) {
  console.log(`[PetVitaliz] API em ${API_URL}`);
}
