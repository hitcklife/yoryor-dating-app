import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import "@/global.css";
import { AuthProvider } from "@/context/auth-context";
import { notificationService } from '@/services/notification-service';
import { webSocketService } from '@/services/websocket-service';
import { register } from '@videosdk.live/react-native-sdk';
import GlobalCallManager from '@/components/GlobalCallManager';

import { useColorScheme } from '@/components/useColorScheme';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { StyledProvider } from '@gluestack-style/react';
import { gluestackConfig } from '@/lib/gluestack-theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Register VideoSDK services before app component registration
register();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
  // Ensure chat routes don't show headers
  headerShown: false,
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize services
  useEffect(() => {
    if (loaded) {
      // Initialize the notification service
      notificationService.initialize().then(token => {
        console.log('Notification service initialized with token:', token);
      }).catch(error => {
        console.error('Error initializing notification service:', error);
      });
    }

    // Clean up notification listeners when component unmounts
    return () => {
      notificationService.cleanup();
    };
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
      <AuthProvider>
        <StyledProvider config={gluestackConfig}>
          <GluestackUIProvider config={gluestackConfig}>
            <GlobalCallManager>
              <RootLayoutNav />
            </GlobalCallManager>
          </GluestackUIProvider>
        </StyledProvider>
      </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
