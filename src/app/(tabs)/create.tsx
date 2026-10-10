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
import { Id } from "@/convex/_generated/dataModel";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File, UploadType } from "expo-file-system";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { PostAudioPlayer } from "@/components/PostAudioPlayer";
import { VideoNoteRecorder } from "@/components/VideoNoteRecorder";
import { VideoNotePlayer } from "@/components/VideoNotePlayer";

export default function CreateScreen() {
  const router = useRouter();

  // Отримуємо поточного користувача з Convex Auth
  const currentUser = useQuery(api.users.currentUser);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  const [caption, setCaption] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Нові стани для відеокружечків:
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [recordedVideoDuration, setRecordedVideoDuration] = useState<number>(0);

  // Хуки запису аудіо
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);

  // Початок запису аудіо
  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Дозвіл відхилено",
        "Для запису аудіо потрібен доступ до мікрофона."
      );
      return;
    }

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error("Помилка старту запису:", error);
      Alert.alert("Помилка", "Не вдалося розпочати запис аудіо.");
    }
  };

  // Зупинка запису аудіо
  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        setRecordedAudioUri(audioRecorder.uri);
        const durationSec = recorderState.durationMillis
          ? Math.round(recorderState.durationMillis / 1000)
          : Math.round(audioRecorder.currentTime || 0);
        setRecordedDuration(durationSec);
      }
    } catch (error) {
      console.error("Помилка зупинки запису:", error);
    }
  };

  // Видалення записаного аудіо
  const removeRecordedAudio = () => {
    setRecordedAudioUri(null);
    setRecordedDuration(0);
  };

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
      // Скидаємо відео, оскільки обрано фото:
      setRecordedVideoUri(null);
      setRecordedVideoDuration(0);
    }
  };

  // Функція створення фото з камери
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Дозвіл відхилено",
        "Для створення знімку потрібен доступ до камери."
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
      // Скидаємо відео, оскільки обрано фото:
      setRecordedVideoUri(null);
      setRecordedVideoDuration(0);
    }
  };

  // Головне діалогове вікно вибору способу додавання медіа
  const pickMedia = () => {
    Alert.alert("Оберіть дію", "Оберіть формат створення публікації", [
      {
        text: "Записати відеокружечок 📹",
        onPress: () => setShowVideoRecorder(true),
      },
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

  // Завантаження файлів у Convex Storage та публікація поста
  const handleShare = async () => {
    if (!selectedImage && !recordedVideoUri) {
      Alert.alert(
        "Увага",
        "Оберіть зображення або запишіть відеокружечок перед публікацією."
      );
      return;
    }

    try {
      setIsSharing(true);

      let storageId: Id<"_storage"> | undefined = undefined;
      let videoStorageId: Id<"_storage"> | undefined = undefined;

      // 1. Завантаження фотографії (якщо є)
      if (selectedImage) {
        const imageUploadUrl = await generateUploadUrl();
        const imageFile = new File(selectedImage);

        const imageUploadResult = await imageFile.upload(imageUploadUrl, {
          httpMethod: "POST",
          uploadType: UploadType.BINARY_CONTENT,
          headers: {
            "Content-Type": "image/jpeg",
          },
        });

        if (imageUploadResult.status < 200 || imageUploadResult.status >= 300) {
          throw new Error("Помилка завантаження фото");
        }
        const imageData = JSON.parse(imageUploadResult.body);
        storageId = imageData.storageId;
      }

      // 2. Завантаження відеокружечка (якщо записано)
      if (recordedVideoUri) {
        const videoUploadUrl = await generateUploadUrl();
        const videoFile = new File(recordedVideoUri);

        const videoUploadResult = await videoFile.upload(videoUploadUrl, {
          httpMethod: "POST",
          uploadType: UploadType.BINARY_CONTENT,
          headers: {
            "Content-Type": "video/mp4",
          },
        });

        if (videoUploadResult.status < 200 || videoUploadResult.status >= 300) {
          throw new Error("Помилка завантаження відео");
        }
        const videoData = JSON.parse(videoUploadResult.body);
        videoStorageId = videoData.storageId;
      }

      // 3. Завантаження аудіосповіщення (якщо записано)
      let audioStorageId: Id<"_storage"> | undefined = undefined;
      if (recordedAudioUri) {
        const audioUploadUrl = await generateUploadUrl();
        const audioFile = new File(recordedAudioUri);

        const audioUploadResult = await audioFile.upload(audioUploadUrl, {
          httpMethod: "POST",
          uploadType: UploadType.BINARY_CONTENT,
          headers: {
            "Content-Type": "audio/m4a",
          },
        });

        if (audioUploadResult.status < 200 || audioUploadResult.status >= 300) {
          throw new Error("Не вдалося завантажити аудіофайл");
        }

        const audioData = JSON.parse(audioUploadResult.body);
        audioStorageId = audioData.storageId;
      }

      // 4. Створення публікації в базі Convex
      await createPost({
        storageId,
        videoStorageId,
        videoDuration:
          recordedVideoDuration > 0 ? recordedVideoDuration : undefined,
        isVideoNote: !!recordedVideoUri,
        caption,
        audioStorageId,
        audioDuration:
          recordedDuration > 0 ? Math.round(recordedDuration) : undefined,
      });

      // 5. Очищення форми та повернення на головну
      setSelectedImage(null);
      setRecordedVideoUri(null);
      setRecordedVideoDuration(0);
      setCaption("");
      removeRecordedAudio();
      router.push("/(tabs)");
      Alert.alert("Успіх", "Публікацію успішно створено!");
    } catch (error) {
      console.error("Помилка публікації:", error);
      Alert.alert(
        "Помилка",
        "Не вдалося завантажити файли або створити пост."
      );
    } finally {
      setIsSharing(false);
    }
  };

  // Якщо медіа ще не обране, показуємо стартовий екран вибору
  if (!selectedImage && !recordedVideoUri) {
    return (
      <View className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Новий пост</Text>
          <View className="w-7" />
        </View>

        <View className="flex-1 justify-center items-center gap-6 p-6">
          {/* Картка 1: Запис відеокружечка */}
          <TouchableOpacity
            className="w-full bg-surface border border-surfaceLight rounded-3xl p-6 items-center gap-3 active:opacity-80"
            onPress={() => setShowVideoRecorder(true)}
          >
            <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center">
              <Ionicons name="videocam" size={32} color={COLORS.primary} />
            </View>
            <Text className="text-white text-base font-semibold">
              Записати відеокружечок
            </Text>
            <Text className="text-grey text-xs text-center">
              Фронтальна камера, круглий видошукач до 60 с
            </Text>
          </TouchableOpacity>

          {/* Картка 2: Додавання фотографії */}
          <TouchableOpacity
            className="w-full bg-surface border border-surfaceLight rounded-3xl p-6 items-center gap-3 active:opacity-80"
            onPress={pickMedia}
          >
            <View className="w-16 h-16 rounded-full bg-surfaceLight items-center justify-center">
              <Ionicons name="image-outline" size={32} color={COLORS.grey} />
            </View>
            <Text className="text-white text-base font-semibold">
              Додати фотографію
            </Text>
            <Text className="text-grey text-xs text-center">
              Зробіть знімок або оберіть із галереї
            </Text>
          </TouchableOpacity>
        </View>

        {/* Модальне вікно запису відеокружечка */}
        <VideoNoteRecorder
          visible={showVideoRecorder}
          onClose={() => setShowVideoRecorder(false)}
          onFinishRecording={(uri, duration) => {
            setRecordedVideoUri(uri);
            setRecordedVideoDuration(duration);
            setSelectedImage(null);
          }}
        />
      </View>
    );
  }

  // Екран заповнення опису, аудіо та відправки поста
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
              setRecordedVideoUri(null);
              setRecordedVideoDuration(0);
              setCaption("");
              removeRecordedAudio();
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
              isSharing ||
              (!selectedImage && !recordedVideoUri) ||
              recorderState.isRecording
                ? "opacity-50"
                : ""
            }`}
            disabled={
              isSharing ||
              (!selectedImage && !recordedVideoUri) ||
              recorderState.isRecording
            }
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
            {/* Секція медіаконтенту: або відеокружечок, або зображення */}
            <View className="w-full aspect-square bg-surface relative justify-center items-center">
              {recordedVideoUri ? (
                <VideoNotePlayer
                  videoUrl={recordedVideoUri}
                  duration={recordedVideoDuration}
                  size={260}
                />
              ) : selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : null}

              {/* Кнопка "Змінити" у правому нижньому кутку блоку */}
              <TouchableOpacity
                className="absolute bottom-4 right-4 bg-black/75 flex-row items-center px-3 py-2 rounded-xl gap-1.5 border border-white/10"
                onPress={pickMedia}
                disabled={isSharing}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text className="text-white text-xs font-semibold">
                  Змінити
                </Text>
              </TouchableOpacity>
            </View>

            {/* Секція опису та голосового запису */}
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

              {/* Блок аудіозапису */}
              <View className="mt-4 p-3 rounded-2xl bg-surface border border-surfaceLight">
                <Text className="text-grey text-xs font-semibold uppercase mb-2 tracking-wider">
                  Аудіосповіщення до публікації
                </Text>

                {recordedAudioUri ? (
                  // Аудіо вже записано: показуємо плеєр та кнопку видалення
                  <View className="gap-2">
                    <PostAudioPlayer
                      audioUrl={recordedAudioUri}
                      duration={recordedDuration}
                    />
                    <TouchableOpacity
                      onPress={removeRecordedAudio}
                      className="flex-row items-center justify-center gap-1.5 py-1.5"
                      disabled={isSharing}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#EF4444"
                      />
                      <Text className="text-red-500 text-xs font-medium">
                        Видалити аудіо
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Процес запису або кнопка старту
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View
                        className={`w-3 h-3 rounded-full ${
                          recorderState.isRecording ? "bg-red-500" : "bg-grey"
                        }`}
                      />
                      <Text className="text-white text-sm">
                        {recorderState.isRecording
                          ? `Запис: ${Math.floor(
                              (recorderState.durationMillis || 0) / 1000
                            )} с`
                          : "Додати голосове сповіщення"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={
                        recorderState.isRecording
                          ? stopRecording
                          : startRecording
                      }
                      disabled={isSharing}
                      className={`px-4 py-2 rounded-xl flex-row items-center gap-1.5 ${
                        recorderState.isRecording ? "bg-red-600" : "bg-primary"
                      }`}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={recorderState.isRecording ? "stop" : "mic"}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text className="text-white text-xs font-semibold">
                        {recorderState.isRecording ? "Зупинити" : "Записати"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Модальне вікно запису відеокружечка доступне також з форми */}
        <VideoNoteRecorder
          visible={showVideoRecorder}
          onClose={() => setShowVideoRecorder(false)}
          onFinishRecording={(uri, duration) => {
            setRecordedVideoUri(uri);
            setRecordedVideoDuration(duration);
            setSelectedImage(null);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}