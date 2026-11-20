import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pesan" options={{ headerShown: false }} />
        
        {/* PASTIKAN SEMUA HALAMAN ADMIN ADA DI SINI DENGAN headerShown: false */}
        <Stack.Screen name="(admin)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)/kendaraan_admin" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)/review_list" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)/acc_peminjaman" options={{ headerShown: false }} />

        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}