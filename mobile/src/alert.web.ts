import type { AlertButton } from 'react-native';

// The app uses informational alerts and two-button confirmations.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (typeof window === 'undefined') return;
    const text = [title, message].filter(Boolean).join('\n\n');
    const action = buttons?.find(button => button.style !== 'cancel');
    if (buttons?.some(button => button.style === 'cancel')) {
      if (window.confirm(text)) action?.onPress?.();
      else buttons.find(button => button.style === 'cancel')?.onPress?.();
    } else {
      window.alert(text);
      action?.onPress?.();
    }
  },
};
