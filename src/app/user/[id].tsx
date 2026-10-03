// src/app/user/[id].tsx
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const targetUserId = id as Id<"users">;
  const router = useRouter();

  const currentUser = useQuery(api.users.currentUser);
  const profile = useQuery(api.users.getUserProfile, { id: targetUserId });
  const posts = useQuery(api.posts.getPostsByUser, { userId: targetUserId });
  const isFollowingUser = useQuery(api.follows.isFollowing, { followingId: targetUserId });

  const toggleFollow = useMutation(api.follows.toggleFollow);

  const isSelf = currentUser?._id === targetUserId;

  const handleFollowPress = async () => {
    try {
      await toggleFollow({ followingId: targetUserId });
    } catch (error) {
      console.error("Помилка зміни підписки:", error);
    }
  };

  if (profile === undefined || posts === undefined || isFollowingUser === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons name="person-remove-outline" size={56} color={COLORS.grey} />
        <Text className="text-white text-lg font-bold mt-3">Користувача не знайдено</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-5 py-2.5 bg-surface rounded-full border border-surfaceLight"
        >
          <Text className="text-primary font-semibold">Повернутися</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen
        options={{
          headerTitle: profile.username ? `@${profile.username}` : profile.fullname ?? "Профіль",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-4">
            {profile.image ? (
              <Image
                source={{ uri: profile.image }}
                className="w-20 h-20 rounded-full border-2 border-surfaceLight"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-surface border-2 border-surfaceLight items-center justify-center">
                <Ionicons name="person" size={38} color={COLORS.primary} />
              </View>
            )}

            <View className="flex-row items-center flex-1 justify-around ml-4">
              <View className="items-center">
                <Text className="text-white text-lg font-bold">{posts.length}</Text>
                <Text className="text-grey text-xs">Публікації</Text>
              </View>

              <View className="items-center">
                <Text className="text-white text-lg font-bold">{profile.followers ?? 0}</Text>
                <Text className="text-grey text-xs">Читачі</Text>
              </View>

              <View className="items-center">
                <Text className="text-white text-lg font-bold">{profile.following ?? 0}</Text>
                <Text className="text-grey text-xs">Стежить</Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-white font-bold text-base">
              {profile.fullname ?? profile.name ?? "Користувач"}
            </Text>
            {profile.bio ? (
              <Text className="text-white/90 text-sm mt-1 leading-5">{profile.bio}</Text>
            ) : null}
          </View>

          {isSelf ? (
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              className="w-full bg-surface border border-surfaceLight py-2.5 rounded-xl items-center active:bg-surfaceLight"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-sm">Перейти до свого профілю</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFollowPress}
              className={`w-full py-2.5 rounded-xl items-center justify-center ${
                isFollowingUser
                  ? "bg-surface border border-surfaceLight active:bg-surfaceLight"
                  : "bg-primary active:opacity-80"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-semibold text-sm ${
                  isFollowingUser ? "text-white" : "text-white"
                }`}
              >
                {isFollowingUser ? "Ви стежите" : "Стежити"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row border-t border-b border-surface py-3 justify-center items-center">
          <Ionicons name="grid" size={20} color={COLORS.primary} />
          <Text className="text-white text-xs font-semibold uppercase ml-2 tracking-wider">
            Публікації
          </Text>
        </View>

        {posts.length === 0 ? (
          <View className="py-16 items-center px-6">
            <Ionicons name="images-outline" size={48} color={COLORS.grey} />
            <Text className="text-white text-base font-bold mt-2">Немає публікацій</Text>
            <Text className="text-grey text-sm text-center mt-1">
              Користувач ще не опублікував жодного фото.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap p-0.5 pb-20">
            {posts.map((post) => (
              <View key={post._id} className="w-1/3 aspect-square p-0.5">
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="w-full h-full bg-surface"
                  onPress={() => router.push(`/post/${post._id}` as any)}
                >
                  <Image
                    source={{ uri: post.imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
