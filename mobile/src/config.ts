import Constants from 'expo-constants';

/**
 * Base URL of the Speakly AI FastAPI backend.
 *
 * For a physical device, replace localhost with your computer's LAN IP
 * (e.g. http://192.168.1.20:8000) in app.json -> expo.extra.apiUrl,
 * because "localhost" on the phone points to the phone itself.
 */
export const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://localhost:8000';
