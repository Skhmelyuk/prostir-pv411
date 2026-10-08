// src/components/StoryViewerModal.tsx
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const STORY_DURATION = 5000; // 5 секунд на один слайд
const TAP_THRESHOLD_MS = 250; // Поріг для розрізнення короткого тапу від затискання

type StoryItem = {
  _id: Id<"stories">;
  imageUrl: string;
  userId: Id<"users">;
  views: number;
  expiresAt: number;
};

type StoryUser = {
  id: string;
  username: string;
  avatar: string;
};

type Props = {
  visible: boolean;
  user: StoryUser;
  stories: StoryItem[];
  onClose: () => void;
};

interface StoryProgressBarProps {
  index: number;
  currentIndex: number;
  progress: SharedValue<number>;
}

/**
 * Окремий компонент смужки прогресу історії.
 * Використання окремого компонента дозволяє викликати useAnimatedStyle
 * без порушення React Rules of Hooks (виклик хуків усередині циклу).
 */
function StoryProgressBar({
  index,
  currentIndex,
  progress,
}: StoryProgressBarProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (index < currentIndex) {
      return { width: "100%" };
    }
    if (index === currentIndex) {
      return { width: `${progress.value * 100}%` };
    }
    return { width: "0%" };
  });

  return (
    <View className="flex-1 h-0.5 bg-white/40 rounded-full overflow-hidden">
      <Animated.View
        className="h-full bg-white rounded-full"
        style={animatedStyle}
      />
    </View>
  );
}

export function StoryViewerModal({ visible, user, stories, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useSharedValue(0);
  const touchStartTime = useRef(0);
  const incrementViews = useMutation(api.stories.incrementViews);

  const currentStory = stories[currentIndex];

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      // Якщо це перша історія — перезапускаємо її спочатку
      progress.value = 0;
      progress.value = withTiming(
        1,
        { duration: STORY_DURATION, easing: Easing.linear },
        (finished) => {
          if (finished) {
            runOnJS(goNext)();
          }
        }
      );
    }
  };

  const handleClose = () => {
    cancelAnimation(progress);
    setCurrentIndex(0);
    onClose();
  };

  // Зупинка анімації при затисканні екрана (Pause)
  const pauseProgress = () => {
    cancelAnimation(progress);
  };

  // Відновлення анімації при відпусканні пальця (Resume)
  const resumeProgress = () => {
    const remainingDuration = (1 - progress.value) * STORY_DURATION;
    if (remainingDuration <= 0) {
      goNext();
      return;
    }
    progress.value = withTiming(
      1,
      { duration: remainingDuration, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(goNext)();
        }
      }
    );
  };

  // Запуск анімації при відкритті та перемиканні історій
  useEffect(() => {
    if (!visible || stories.length === 0) return;

    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: STORY_DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(goNext)();
        }
      }
    );

    if (currentStory) {
      incrementViews({ storyId: currentStory._id }).catch(() => {});
    }

    return () => {
      cancelAnimation(progress);
    };
  }, [visible, currentIndex]);

  if (!visible || stories.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black relative">
        {/* Фонове зображення історії */}
        <Image
          source={{ uri: currentStory?.imageUrl }}
          className="w-full h-full absolute"
          resizeMode="cover"
        />

        {/* Прогрес-бари кожної історії */}
        <View className="flex-row px-2 pt-12 gap-1 z-10">
          {stories.map((_, index) => (
            <StoryProgressBar
              key={index}
              index={index}
              currentIndex={currentIndex}
              progress={progress}
            />
          ))}
        </View>

        {/* Хедер: інформація про автора та кнопка закриття */}
        <View className="flex-row items-center justify-between px-4 pt-3 z-10">
          <View className="flex-row items-center gap-2.5">
            <Image
              source={{ uri: user.avatar }}
              className="w-9 h-9 rounded-full border-2 border-white"
            />
            <Text className="text-white font-semibold text-sm">
              {user.username}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} className="p-1">
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Сенсорні зони перемикання та паузи (ліворуч / праворуч) */}
        <View className="absolute inset-0 flex-row z-0">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPressIn={() => {
              touchStartTime.current = Date.now();
              pauseProgress();
            }}
            onPressOut={() => {
              resumeProgress();
            }}
            onPress={() => {
              if (Date.now() - touchStartTime.current < TAP_THRESHOLD_MS) {
                goPrev();
              }
            }}
          />
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPressIn={() => {
              touchStartTime.current = Date.now();
              pauseProgress();
            }}
            onPressOut={() => {
              resumeProgress();
            }}
            onPress={() => {
              if (Date.now() - touchStartTime.current < TAP_THRESHOLD_MS) {
                goNext();
              }
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
