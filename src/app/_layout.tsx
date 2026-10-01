import "../../global.css";

import { SafeAreaView } from "react-native-safe-area-context";
import { Platform } from 'react-native'
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import InitialLayout from "@/components/InitialLayout";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});
 
const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};


export default function RootLayout() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <ConvexAuthProvider
        client={convex}
        storage={
          Platform.OS === "android" || Platform.OS === "ios"
            ? secureStorage
            : undefined
        }
      >
        <InitialLayout />
      </ConvexAuthProvider>
    </SafeAreaView>
  );
}
