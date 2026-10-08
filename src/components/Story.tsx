// src/components/Story.tsx
import { useEffect } from "react";
import { Text, Image, TouchableOpacity, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

type StoryUser = {
  id: string;
  username: string;
  avatar: string;
  hasStory: boolean;
  isCurrentUser?: boolean;
};

interface StoryProps {
  story: StoryUser;
  onPress: () => void;
}

export default function Story({ story, onPress }: StoryProps) {
  const ringScale = useSharedValue(1);
  const opasity = useSharedValue(1)

  useEffect(() => {
    if (story.hasStory) {
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1.0, {
            duration: 500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // Нескінченно
        false
      );

      opasity.value = withRepeat(
                withSequence(
          withTiming(0, {duration: 500, easing: Easing.inOut(Easing.ease)}),
          withTiming(1, {duration: 500, easing: Easing.inOut(Easing.ease)})
        ), -1, false

      )

    } else {
      ringScale.value = 1;
    }
  }, [story.hasStory, ringScale]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: opasity.value
  }));

  return (
    <TouchableOpacity
      className="items-center mx-2 w-[72px]"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="relative w-[68px] h-[68px] justify-center items-center">
      {/* Пульсуюче кільце історії */}
        <Animated.View
          style={[story.hasStory ? animatedRingStyle : undefined]}
          className={`absolute inset-0 w-[68px] h-[68px] rounded-full border-2 ${
            story.hasStory ? "border-primary" : "border-surfaceLight"
          }`}
        />
          <Image
            source={{ uri: story.avatar }}
            className="absolute  w-[58px] h-[58px] rounded-full border border-black"
          />
      </View>
      <Text className="text-white text-xs text-center" numberOfLines={1}>
        {story.username}
      </Text>
    </TouchableOpacity>
  );
}
