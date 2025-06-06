import { DefaultTheme } from '@react-navigation/native';

export const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007AFF',
    background: '#fff',
    card: '#f5f5f5',
    text: '#222',
    border: '#eee',
    notification: '#ff4444',
  },
};