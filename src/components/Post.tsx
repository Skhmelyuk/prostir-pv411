// src/components/Post.tsx
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { CommentsModal } from "./CommentsModal";

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
};

export const Post = ({ post }: PostProps) => {
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const [commentsCount, setCommentsCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);

  const currentUser = useQuery(api.users.currentUser);
  const deletePost = useMutation(api.posts.deletePost);

  const isOwner = currentUser?._id === (post.userId ?? post.author._id);

  const handleDelete = () => {
    Alert.alert("Видалити пост", "Ви впевнені, що хочете видалити цей пост?", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Видалити",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost({ postId: post._id });
          } catch (error) {
            console.error("Помилка видалення поста:", error);
            Alert.alert("Помилка", "Не вдалося видалити пост.");
          }
        },
      },
    ]);
  };

  const toggleLike = useMutation(api.likes.toggleLike);
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);

  const handleLike = async () => {
    const nextIsLiked = !isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(nextIsLiked);
    setLikesCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

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
    <View className="mb-4 bg-black">
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
            onPress={handleDelete}
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
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={24}
              color={isLiked ? "#EF4444" : COLORS.white}
            />
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
    </View>
  );
};
