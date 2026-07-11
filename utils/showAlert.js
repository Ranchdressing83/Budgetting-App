import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert. React Native's Alert.alert is a no-op on web.
 */
export function showAlert(title, message) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }

  Alert.alert(title, message);
}
