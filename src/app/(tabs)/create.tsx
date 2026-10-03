// src/app/(tabs)/create.tsx
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { fetch } from "expo/fetch";

export default function CreateScreen() {
  const router = useRouter();

  // Отримуємо поточного користувача з Convex Auth
  const currentUser = useQuery(api.users.currentUser);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  const [caption, setCaption] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Функція вибору зображення з галереї
  const pickImageFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Функція створення фото з камери
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Дозвіл відхилено",
        "Для створення знімку потрібен доступ до камери.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Головна функція для вибору способу додавання зображення
  const pickImage = () => {
    Alert.alert("Оберіть дію", "Оберіть джерело для додавання зображення", [
      {
        text: "Зробити фото",
        onPress: takePhoto,
      },
      {
        text: "Обрати з галереї",
        onPress: pickImageFromLibrary,
      },
      {
        text: "Скасувати",
        style: "cancel",
      },
    ]);
  };

  // Завантаження зображення у Convex Storage та публікація поста
  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      setIsSharing(true);

      // 1. Отримуємо одноразове посилання для завантаження файлу
      const uploadUrl = await generateUploadUrl();

      // 2. Створюємо інстанс файлу з URI зображення через expo-file-system
      const file = new File(selectedImage);

      // 3. Завантажуємо зображення через expo/fetch API
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        body: file,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      if (!uploadResult.ok) throw new Error("Upload failed");

      // 4. Отримуємо унікальний storageId файлу
      const { storageId } = await uploadResult.json();

      // 5. Створюємо пост із посиланням на цей файл у БД
      await createPost({ storageId, caption });

      // 6. Очищаємо форму та перенаправляємо на головний екран
      setSelectedImage(null);
      setCaption("");
      router.push("/(tabs)");
      Alert.alert("Успіх", "Публікацію успішно створено!");
    } catch (error) {
      console.error("Error sharing post:", error);
      Alert.alert(
        "Помилка",
        "Не вдалося завантажити зображення або створити пост.",
      );
    } finally {
      setIsSharing(false);
    }
  };

  // Якщо картинка ще не обрана, показуємо екран вибору
  if (!selectedImage) {
    return (
      <View className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Новий пост</Text>
          <View className="w-7" />
        </View>

        <TouchableOpacity
          className="flex-1 justify-center items-center gap-3 p-6"
          onPress={pickImage}
          activeOpacity={0.8}
        >
          <View className="w-20 h-20 rounded-full bg-surface border border-surfaceLight items-center justify-center">
            <Ionicons name="image-outline" size={40} color={COLORS.grey} />
          </View>
          <Text className="text-grey text-base font-medium">
            Натисніть, щоб обрати фото
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Екран заповнення опису та відправки поста
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-black"
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View className="flex-1">
        {/* Хедер */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(null);
              setCaption("");
            }}
            disabled={isSharing}
          >
            <Ionicons
              name="close-outline"
              size={28}
              color={isSharing ? COLORS.grey : "#FFFFFF"}
            />
          </TouchableOpacity>

          <Text className="text-white text-lg font-semibold">Новий пост</Text>

          <TouchableOpacity
            className={`px-3 py-1.5 min-w-[70px] items-center justify-center rounded-xl bg-primary active:opacity-90 ${
              isSharing || !selectedImage ? "opacity-50" : ""
            }`}
            disabled={isSharing || !selectedImage}
            onPress={handleShare}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-sm font-bold">Опублікувати</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className={`flex-1 ${isSharing ? "opacity-70" : ""}`}>
            {/* Секція зображення */}
            <View className="w-full aspect-square bg-surface relative justify-center items-center">
              <Image
                source={{ uri: selectedImage }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <TouchableOpacity
                className="absolute bottom-4 right-4 bg-black/75 flex-row items-center px-3 py-2 rounded-xl gap-1.5"
                onPress={pickImage}
                disabled={isSharing}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                <Text className="text-white text-xs font-semibold">
                  Змінити
                </Text>
              </TouchableOpacity>
            </View>

            {/* Секція опису */}
            <View className="p-4 flex-1">
              <View className="flex-row items-start">
                {currentUser?.image ? (
                  <Image
                    source={{ uri: currentUser.image }}
                    className="w-10 h-10 rounded-full mr-3 border border-surfaceLight"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full mr-3 bg-surface border border-surfaceLight items-center justify-center">
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                  </View>
                )}
                <TextInput
                  className="flex-1 text-white text-base pt-2 min-h-[44px]"
                  placeholder="Напишіть опис до публікації..."
                  placeholderTextColor={COLORS.grey}
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isSharing}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}