// src/components/Post.tsx
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { CommentsModal } from "./CommentsModal";
import { HoldToConfirmButton } from "./HoldToConfirmButton";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

export type PostProps = {
  post: {
    _id: Id<"posts">;
    userId?: Id<"users">;
    imageUrl: string;
    caption?: string;
    likes: number;
    comments: number;
    _creationTime: number;
    isLiked: boolean;
    isBookmarked: boolean;
    author: {
      _id?: Id<"users">;
      username: string;
      image: string;
    };
  };
  index?: number;
};

export const Post = ({ post, index }: PostProps) => {
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Reanimated: Завдання 1 - Пружний відгук кнопки Лайку
  const likeScale = useSharedValue(1);

  const animatedLikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  // Reanimated: Завдання 2 - Каскадна поява постів у стрічці (Fade-in + Slide-up)
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  const delay = Math.min((index ?? 0) * 70, 400);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, opacity, translateY]);

  const animatedPostStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const currentUser = useQuery(api.users.currentUser);
  const deletePost = useMutation(api.posts.deletePost);

  const isOwner = currentUser?._id === (post.userId ?? post.author._id);

  const handleConfirmDelete = async () => {
    try {
      await deletePost({ postId: post._id });
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Помилка видалення поста:", error);
      Alert.alert("Помилка", "Не вдалося видалити публікацію.");
    }
  };

  const toggleLike = useMutation(api.likes.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);

  const handleLike = async () => {
    const nextIsLiked = !isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(nextIsLiked);
    setLikesCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    // 🚀 Запуск пружини у UI-потоці:
    if (nextIsLiked) {
      likeScale.value = withSequence(
        withSpring(1.35, { damping: 7, stiffness: 260 }),
        withSpring(1, { damping: 10, stiffness: 180 })
      );
    } else {
      likeScale.value = withSequence(
        withSpring(0.85, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
    }

    try {
      const serverIsLiked = await toggleLike({ postId: post._id });
      if (serverIsLiked !== nextIsLiked) {
        setIsLiked(serverIsLiked);
        setLikesCount((prev) =>
          serverIsLiked ? prev + 1 : Math.max(0, prev - 1),
        );
      }
    } catch (error) {
      console.error("Помилка оновлення лайка:", error);
      setIsLiked(post.isLiked);
      setLikesCount(previousLikesCount);
    }
  };

  const handleBookmark = async () => {
    const nextIsBookmarked = !isBookmarked;
    setIsBookmarked(nextIsBookmarked);

    try {
      const serverIsBookmarked = await toggleBookmark({ postId: post._id });
      if (serverIsBookmarked !== nextIsBookmarked) {
        setIsBookmarked(serverIsBookmarked);
      }
    } catch (error) {
      console.error("Помилка збереження в закладки:", error);
      setIsBookmarked(post.isBookmarked);
    }
  };

  const handleAuthorPress = () => {
    if (post.author._id) {
      if (currentUser?._id === post.author._id) {
        router.push("/profile");
      } else {
        router.push(`/user/${post.author._id}`);
      }
    }
  };

  return (
    <Animated.View style={animatedPostStyle} className="mb-4 bg-black">
      {/* Хедер поста з переходом до профілю автора */}
      <View className="flex-row items-center justify-between p-3">
        <TouchableOpacity
          onPress={handleAuthorPress}
          activeOpacity={0.8}
          className="flex-row items-center"
        >
          <Image
            source={{ uri: post.author.image }}
            className="w-8 h-8 rounded-full mr-2.5 border border-surfaceLight"
          />
          <Text className="text-white text-sm font-semibold">
            {post.author.username}
          </Text>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowDeleteModal(true)}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Зображення поста */}
      <Image
        source={{ uri: post.imageUrl }}
        className="w-full aspect-square bg-surface"
        resizeMode="cover"
      />

      {/* Кнопки дій */}
      <View className="flex-row items-center justify-between px-3 py-3">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={handleLike} activeOpacity={0.7}>
            <Animated.View style={animatedLikeStyle}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color={isLiked ? "#EF4444" : COLORS.white}
              />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleBookmark} activeOpacity={0.7}>
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {/* Лічильники та опис */}
      <View className="px-3">
        <Text className="text-white text-sm font-semibold mb-1.5">
          {likesCount > 0
            ? `${likesCount.toLocaleString()} вподобань`
            : "Будьте першим, кому це сподобалося"}
        </Text>

        {post.caption ? (
          <View className="flex-row flex-wrap mb-1.5">
            <TouchableOpacity onPress={handleAuthorPress}>
              <Text className="text-white text-sm font-semibold mr-1.5">
                {post.author.username}
              </Text>
            </TouchableOpacity>
            <Text className="text-white text-sm flex-1">{post.caption}</Text>
          </View>
        ) : null}

        {commentsCount > 0 && (
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            className="mt-0.5 mb-1"
          >
            <Text className="text-grey text-sm">
              Переглянути всі {commentsCount} коментарів
            </Text>
          </TouchableOpacity>
        )}

        <Text className="text-grey text-xs mb-2">
          {formatDistanceToNow(post._creationTime, { addSuffix: true })}
        </Text>
      </View>

      {/* Модальне вікно коментарів */}
      {showComments && (
        <CommentsModal
          postId={post._id}
          visible={showComments}
          onClose={() => setShowComments(false)}
          onCommentsCountChange={setCommentsCount}
        />
      )}

      {/* Модальне вікно безпечного видалення публікації */}
      {isOwner && (
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1 bg-black/80 justify-end p-4">
              {/* Фоновий оверлей: натискання закриває модалку */}
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowDeleteModal(false)}
              />

              {/* Контент модального вікна */}
              <View className="bg-surface border border-surfaceLight rounded-3xl p-5 gap-4">
                <View className="items-center">
                  <View className="w-12 h-12 rounded-full bg-red-500/20 items-center justify-center mb-3">
                    <Ionicons name="trash-outline" size={26} color="#EF4444" />
                  </View>
                  <Text className="text-white text-lg font-bold mb-1">
                    Видалити публікацію?
                  </Text>
                  <Text className="text-grey text-xs text-center px-4">
                    Цю дію неможливо скасувати. Для підтвердження затисніть кнопку нижче на 1.2 секунди.
                  </Text>
                </View>

                {/* Кнопка з утриманням */}
                <HoldToConfirmButton
                  title="Затисніть для видалення"
                  confirmTitle="Видаляємо..."
                  icon="trash-outline"
                  variant="danger"
                  durationMs={1200}
                  onConfirm={handleConfirmDelete}
                />

                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  className="py-3 items-center"
                >
                  <Text className="text-grey text-sm font-medium">Скасувати</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GestureHandlerRootView>
        </Modal>
      )}
    </Animated.View>
  );
};
