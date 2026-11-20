import { FontAwesome } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Import Firebase Firestore
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../constants/firebaseConfig";

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const idPeminjaman = params.id_peminjaman;
  const namaDriver = (params.nama_driver as string) || "Driver";

  // STATE: 3 KRITERIA RATING
  const [ratingKebersihan, setRatingKebersihan] = useState(0);
  const [ratingKenyamanan, setRatingKenyamanan] = useState(0);
  const [ratingKeamanan, setRatingKeamanan] = useState(0);

  const [ulasan, setUlasan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FUNGSI UPDATE DATA KE FIREBASE ---
  const handleSubmit = async () => {
    // Validasi ID Peminjaman
    if (!idPeminjaman) {
      Alert.alert("Error", "ID Peminjaman tidak ditemukan.");
      return;
    }

    // Validasi Wajib Isi Semua Rating
    if (
      ratingKebersihan === 0 ||
      ratingKenyamanan === 0 ||
      ratingKeamanan === 0
    ) {
      Alert.alert(
        "Oops!",
        "Tolong berikan bintang untuk ketiga kriteria pelayanan ya!",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const peminjamanRef = doc(db, "tb_peminjaman", String(idPeminjaman));

      // Menghitung rata-rata rating
      const rataRata = (
        (ratingKebersihan + ratingKenyamanan + ratingKeamanan) /
        3
      ).toFixed(1);

      // Memperbarui field dengan struktur data baru
      await updateDoc(peminjamanRef, {
        rating: Number(rataRata),
        rating_kebersihan: ratingKebersihan,
        rating_kenyamanan: ratingKenyamanan,
        rating_keamanan: ratingKeamanan,
        ulasan: ulasan.trim(),
      });

      setIsSubmitting(false);
      Alert.alert(
        "Berhasil!",
        `Ulasan detail untuk ${namaDriver} berhasil dikirim. Terima kasih!`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      setIsSubmitting(false);
      console.error("Error kirim ulasan:", err);
      Alert.alert(
        "Error",
        "Gagal mengirim ulasan. Pastikan koneksi internet stabil.",
      );
    }
  };

  // Komponen Helper untuk menggambar 5 Bintang
  const RatingBar = ({
    label,
    value,
    onRate,
  }: {
    label: string;
    value: number;
    onRate: (val: number) => void;
  }) => (
    <View style={styles.ratingBarContainer}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            activeOpacity={0.7}
            onPress={() => onRate(star)}
            style={styles.starButton}
          >
            <FontAwesome
              name={value >= star ? "star" : "star-o"}
              size={30}
              color={value >= star ? "#F59E0B" : "#E2E8F0"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="#072B69" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Penilaian Layanan</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.ratingSection}>
          <Text style={styles.questionText}>Bagaimana perjalananmu?</Text>
          <Text style={styles.driverInfoText}>
            bersama{" "}
            <Text style={{ fontWeight: "bold", color: "#072B69" }}>
              {namaDriver}
            </Text>
          </Text>

          <View style={styles.kriteriaBox}>
            <RatingBar
              label="1. Kebersihan Armada"
              value={ratingKebersihan}
              onRate={setRatingKebersihan}
            />
            <View style={styles.divider} />

            <RatingBar
              label="2. Kenyamanan Perjalanan"
              value={ratingKenyamanan}
              onRate={setRatingKenyamanan}
            />
            <View style={styles.divider} />

            <RatingBar
              label="3. Keamanan Berkendara"
              value={ratingKeamanan}
              onRate={setRatingKeamanan}
            />
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            Tulis ulasan tambahan (opsional)
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Driver sangat ramah, mobil bersih dan wangi..."
            placeholderTextColor="#94A3B8"
            multiline={true}
            numberOfLines={4}
            value={ulasan}
            onChangeText={setUlasan}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {isSubmitting ? "Mengirim Data..." : "Kirim Penilaian"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    elevation: 2,
  },
  backBtn: { padding: 5, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#072B69" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },

  ratingSection: { alignItems: "center", marginBottom: 20 },
  questionText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 6,
  },
  driverInfoText: { fontSize: 14, color: "#64748B", marginBottom: 25 },

  kriteriaBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  ratingBarContainer: {
    alignItems: "center",
    marginVertical: 5,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  starButton: { padding: 4 },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    width: "100%",
    marginVertical: 15,
  },

  inputSection: { width: "100%", marginTop: 10 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 10,
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: "#1E293B",
    minHeight: 100,
    elevation: 1,
  },

  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  submitBtn: {
    backgroundColor: "#0B5ED7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#94A3B8" },
  submitBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
