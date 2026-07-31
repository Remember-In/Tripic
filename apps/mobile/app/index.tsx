import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [photoUri, setPhotoUri] = useState<string>();

  const choosePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("사진 접근 권한이 필요해요", "사진을 선택해 여행 기록을 시작할 수 있어요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      exif: true,
    });

    if (!result.canceled) {
      // EXIF의 GPS는 다음 후보 조회 화면까지 메모리에서만 사용한다.
      // 서버 전송이나 SQLite 저장은 절대 하지 않는다.
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Tripic</Text>
        <Text style={styles.description}>
          사진으로 남기는 나만의 여행 지도
        </Text>
        <Text style={styles.notice}>
          사진 위치 정보는 기기 안에서만 처리됩니다.
        </Text>
        {photoUri ? <Text style={styles.selected}>사진을 선택했어요.</Text> : null}
        <Pressable accessibilityRole="button" onPress={choosePhoto} style={styles.button}>
          <Text style={styles.buttonText}>사진 선택하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFBF7" },
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  title: { color: "#2A1D17", fontSize: 36, fontWeight: "700" },
  description: { color: "#5E514A", fontSize: 18 },
  notice: { color: "#7A6D65", fontSize: 14, lineHeight: 20 },
  selected: { color: "#2E7D5B", fontSize: 15, fontWeight: "600" },
  button: {
    alignItems: "center",
    backgroundColor: "#E95B35",
    borderRadius: 14,
    marginTop: 8,
    paddingVertical: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
