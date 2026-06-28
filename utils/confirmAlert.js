import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog. React Native's Alert.alert is a no-op on web.
 */
export function confirmDelete(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(message ? `${title}\n\n${message}` : title);
    if (confirmed) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
}
