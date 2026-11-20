import { FontAwesome } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 🔥 Import Firebase Firestore 🔥
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

export default function ReviewListScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- MENGAMBIL DATA REVIEW LANGSUNG DARI tb_peminjaman ---
  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Mengambil dari koleksi tb_peminjaman di mana rating sudah terisi (lebih dari 0)
      const q = query(collection(db, "tb_peminjaman"), where("rating", ">", 0));
      const querySnapshot = await getDocs(q);

      const fetchedReviews = querySnapshot.docs.map((doc) => ({
        id_review: doc.id,
        ...doc.data(),
      }));

      // Mengurutkan agar review terbaru muncul di paling atas berdasarkan timestamp
      fetchedReviews.sort((a: any, b: any) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      setReviews(fetchedReviews);
      setLoading(false);
    } catch (err) {
      console.error("Error ambil review:", err);
      Alert.alert("Error", "Gagal mengambil data ulasan.");
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, []),
  );

  return (
    <View style={styles.container}>
      {/* 🚀 Menyembunyikan header bawaan Expo Router 🚀 */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER FULL KE SAMPING */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Review Driver</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0B5ED7"
          style={{ marginTop: 40 }}
        />
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Belum ada review atau penilaian yang masuk dari pegawai.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item: any) => String(item.id_review)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <Text style={styles.subtitle}>
              Penilaian dan ulasan dari pegawai terhadap performa driver.
            </Text>
          }
          renderItem={({ item }: any) => {
            const namaDriver =
              item.pengemudi || item.nama_driver || "Driver Tidak Diketahui";
            const teksKomentar = item.ulasan || item.komentar;
            const tanggalReview =
              item.tanggal ||
              (item.timestamp
                ? new Date(item.timestamp).toLocaleDateString("id-ID")
                : "-");

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.driverName}>🚘 Driver: {namaDriver}</Text>
                  <View style={styles.ratingBox}>
                    <Text style={styles.ratingText}>{item.rating} </Text>
                    <FontAwesome name="star" color="#FFD700" size={14} />
                  </View>
                </View>

                {/* Teks Komentar Dinamis */}
                <Text
                  style={[
                    styles.comment,
                    !teksKomentar && { color: "#94A3B8" },
                  ]}
                >
                  "{teksKomentar || "Tidak ada komentar tertulis."}"
                </Text>

                <View style={styles.footerRow}>
                  <Text style={styles.metaText}>
                    Peminjam: {item.nama_peminjam || "Pegawai"}
                  </Text>
                  <Text style={styles.metaText}>📅 {tanggalReview}</Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={<View style={{ height: 30 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    elevation: 2,
  },
  backBtn: { width: 30, height: 30, justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    flex: 1,
  },

  scrollContent: { padding: 20 },
  emptyContainer: { padding: 20 },

  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 15 },

  emptyCard: {
    backgroundColor: "#FFF",
    padding: 25,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyText: { color: "#64748B", fontStyle: "italic", textAlign: "center" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  driverName: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: { fontWeight: "bold", color: "#D97706", fontSize: 13 },
  comment: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#334155",
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  metaText: { fontSize: 12, color: "#64748B" },
});
