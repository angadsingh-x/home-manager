import { Toaster } from 'sonner';
import { useTheme } from '@/theme/useTheme';

export function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="bottom-center"
      // Lift above BottomNav so toasts don't get covered.
      offset={88}
      duration={2000}
      richColors
      closeButton={false}
    />
  );
}
