import {
  View,
  Text,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export default function ProfileScreen() {
  // Автоматично реагує на зміну даних у реальному часі
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();

  if (user === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (user === null) {
    return (
      <View className="flex-1 bg-black justify-center items-center p-6">
        <Text className="text-white text-base text-center">
          Будь ласка, увійдіть у додаток
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black p-6">
      {/* Аватар користувача */}
      <View className="items-center mb-6">
        {user.image ? (
          <Image
            source={{ uri: user.image }}
            className="w-24 h-24 rounded-full border-2 border-surfaceLight"
          />
        ) : (
          <View className="w-24 h-24 rounded-full bg-surface border-2 border-surfaceLight items-center justify-center">
            <Ionicons name="person" size={44} color={COLORS.primary} />
          </View>
        )}

        <Text className="text-white text-2xl font-bold mt-4">
          {user.name ?? user.fullname ?? "Без імені"}
        </Text>
        <Text className="text-grey text-sm mt-1">{user.email}</Text>
      </View>

      {/* Опис (Bio) */}
      {user.bio ? (
        <View className="bg-surface border border-surfaceLight rounded-2xl p-4 mb-6">
          <Text className="text-grey text-xs uppercase font-semibold mb-1">
            Про себе
          </Text>
          <Text className="text-white text-sm">{user.bio}</Text>
        </View>
      ) : null}

      {/* Кнопка виходу з акаунту */}
      <TouchableOpacity
        className="mt-4 bg-red-600 active:bg-red-700 py-3.5 rounded-2xl items-center justify-center flex-row"
        activeOpacity={0.8}
        onPress={async () => {
          await signOut();
        }}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text className="text-white text-base font-bold">Вийти з акаунту</Text>
      </TouchableOpacity>
    </View>
  );
}