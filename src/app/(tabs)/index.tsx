// src/app/(tabs)/index.tsx
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StoriesSection } from "@/components/StoriesSection";
import { Post } from "@/components/Post";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export default function FeedScreen() {
  const posts = useQuery(api.posts.getPosts);
  const { signOut } = useAuthActions();

  if (posts === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Хедер додатку Prostir */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <Text className="text-2xl font-bold text-primary">Prostir</Text>
        <TouchableOpacity
          onPress={() => signOut()}
          className="p-1 active:opacity-70"
        >
          <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Стрічка постів з секцією історій у хедері списку */}
      <FlatList
        data={posts}
        renderItem={({ item }) => <Post post={item} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        ListHeaderComponent={<StoriesSection />}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-12 px-6">
            <Ionicons
              name="images-outline"
              size={48}
              color={COLORS.grey}
              style={{ marginBottom: 12 }}
            />
            <Text className="text-grey text-base text-center">
              Постів ще немає. Створіть перший у вкладці "+"
            </Text>
          </View>
        }
      />
    </View>
  );
}
