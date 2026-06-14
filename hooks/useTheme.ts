import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark  = scheme === 'dark';
  const tokens  = isDark ? Colors.dark : Colors.light;
  return { isDark, colors: Colors, tokens, scheme };
}
