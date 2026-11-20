import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

export default function RiwayatScreen() {
  const router = useRouter();

  const [namaPengguna, setNamaPengguna] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Semua");

  // --- FUNGSI MENGAMBIL RIWAYAT DARI FIREBASE CLOUD ---
  const fetchHistory = async () => {
    setLoading(true);

    try {
      // 1. Ambil nama dari memori HP
      const session = await AsyncStorage.getItem("userSession");
      let namaYangDicari = "";

      if (session) {
        const parsedSession = JSON.parse(session);
        namaYangDicari = parsedSession.nama || "";
        setNamaPengguna(namaYangDicari);
      }

      if (!namaYangDicari) {
        setHistory([]);
        setLoading(false);
        return;
      }

      // 2. Cari riwayat berdasarkan nama peminjam
      const q = query(
        collection(db, "tb_peminjaman"),
        where("nama_peminjam", "==", namaYangDicari),
      );

      const querySnapshot = await getDocs(q);
      const fetchedHistory = querySnapshot.docs.map((doc) => ({
        id_peminjaman: doc.id,
        ...doc.data(),
      }));

      // Urutkan dari yang terbaru
      fetchedHistory.sort((a: any, b: any) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      setHistory(fetchedHistory);
      setLoading(false);
    } catch (error) {
      console.error("Error Riwayat:", error);
      setHistory([]);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, []),
  );

  const filteredHistory = history.filter((item: any) => {
    if (activeTab === "Semua") return true;
    if (activeTab === "Selesai") return item.status === "Selesai";
    if (activeTab === "Belum Selesai") return item.status !== "Selesai";
    return true;
  });

  return (
    <View style={styles.container}>
      {/* --- PAGE HEADER --- */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Riwayat Perjalanan</Text>
        <Text style={styles.pageSubtitle}>
          Daftar peminjaman milik {namaPengguna || "Pegawai"}
        </Text>
      </View>

      {/* --- TAB FILTER --- */}
      <View style={styles.tabContainer}>
        {["Semua", "Selesai", "Belum Selesai"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- LIST RIWAYAT --- */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0B5ED7"
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyBox}>
              <FontAwesome
                name="folder-open-o"
                size={40}
                color="#CBD5E1"
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.emptyText}>
                Belum ada riwayat di kategori ini.
              </Text>
            </View>
          ) : (
            filteredHistory.map((item: any) => {
              const isApproved = item.status === "Disetujui";
              const isPending = item.status === "Menunggu ACC";
              const isCompleted = item.status === "Selesai";
              const isRejected = item.status === "Ditolak";

              // 👇 PERBAIKAN LOGIKA WARNA BADGE STATUS 👇
              let badgeBg = "#F1F5F9"; // Default Abu-abu
              let badgeText = "#475569";

              if (isPending) {
                badgeBg = "#FEF3C7"; // Kuning
                badgeText = "#D97706";
              } else if (isRejected) {
                badgeBg = "#FEF2F2"; // Merah
                badgeText = "#EF4444";
              } else if (isApproved) {
                badgeBg = "#D1FAE5"; // Hijau
                badgeText = "#059669";
              }

              return (
                <TouchableOpacity
                  key={item.id_peminjaman}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/detail",
                      params: {
                        id_peminjaman: item.id_peminjaman
                          ? String(item.id_peminjaman)
                          : "-",
                        tujuan: item.tujuan ? String(item.tujuan) : "-",
                        tanggal: item.tanggal ? String(item.tanggal) : "-",
                        jam: item.jam ? String(item.jam) : "-",
                        jenis_kendaraan: item.jenis_kendaraan
                          ? String(item.jenis_kendaraan)
                          : "-",
                        status: item.status ? String(item.status) : "-",
                        pengemudi: item.pengemudi
                          ? String(item.pengemudi)
                          : "-",
                        rating: item.rating ? String(item.rating) : "0",
                        ulasan: item.ulasan ? String(item.ulasan) : "-",
                        keperluan: item.keperluan
                          ? String(item.keperluan)
                          : "-",
                        penumpang: String(
                          item.jumlah_penumpang ||
                            item.penumpang ||
                            item.jml_penumpang ||
                            item.jumlah ||
                            "-",
                        ),
                        asal: item.asal ? String(item.asal) : "Kantor Pusat",
                        // 👇 PARAMETER DITAMBAHKAN UNTUK DETAIL SCREEN 👇
                        alasan_tolak: item.alasan_tolak
                          ? String(item.alasan_tolak)
                          : "",
                      },
                    })
                  }
                >
                  <View style={styles.cardRow}>
                    <View style={styles.iconBox}>
                      <FontAwesome
                        name={
                          isCompleted
                            ? "check-circle"
                            : isApproved
                              ? "car"
                              : isRejected
                                ? "times-circle"
                                : "clock-o"
                        }
                        size={18}
                        color={
                          isCompleted
                            ? "#64748B"
                            : isApproved
                              ? "#059669"
                              : isRejected
                                ? "#EF4444"
                                : "#F59E0B"
                        }
                      />
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{item.tujuan}</Text>
                      <Text style={styles.cardDate}>
                        {item.tanggal} • {item.jam} WIB
                      </Text>
                      <Text style={styles.cardRoute}>
                        {item.asal || "Kantor Pusat"} ➔ {item.tujuan}
                      </Text>

                      {isApproved || isCompleted ? (
                        <Text style={styles.cardDriver}>
                          👤 {item.pengemudi || "Belum ada"} (
                          {item.no_polisi || "-"})
                        </Text>
                      ) : isRejected ? (
                        <Text style={[styles.cardDriver, { color: "#EF4444" }]}>
                          ❌ Pengajuan ditolak admin.
                        </Text>
                      ) : (
                        <Text style={styles.cardDriver}>
                          ⏳ Menunggu alokasi dari Admin.
                        </Text>
                      )}
                    </View>

                    <View style={styles.cardRight}>
                      <View
                        style={[styles.badge, { backgroundColor: badgeBg }]}
                      >
                        <Text style={[styles.badgeText, { color: badgeText }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* === LOGIKA TOMBOL REVIEW === */}
                  {isCompleted && item.rating ? (
                    <View style={styles.reviewBtnSuccess}>
                      <FontAwesome
                        name="check-circle"
                        size={14}
                        color="#059669"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.reviewBtnSuccessText}>
                        Ulasan Terkirim
                      </Text>
                    </View>
                  ) : isCompleted && !item.rating ? (
                    <TouchableOpacity
                      style={styles.reviewBtnPrimary}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: "/review",
                          params: {
                            id_peminjaman: item.id_peminjaman,
                            nama_driver: item.pengemudi,
                          },
                        })
                      }
                    >
                      <FontAwesome
                        name="star"
                        size={14}
                        color="#FFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.reviewBtnPrimaryText}>
                        Berikan Ulasan
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  pageHeader: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 15 },
  pageTitle: { fontSize: 22, fontWeight: "bold", color: "#072B69" },
  pageSubtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginRight: 10,
  },
  tabButtonActive: { backgroundColor: "#0B5ED7", borderColor: "#0B5ED7" },
  tabText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  tabTextActive: { color: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 5 },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 20,
  },
  emptyText: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 2,
  },
  cardDate: { fontSize: 12, color: "#64748B", marginBottom: 6 },
  cardRoute: { fontSize: 13, color: "#475569", marginBottom: 4 },
  cardDriver: { fontSize: 12, color: "#94A3B8" },
  cardRight: { marginLeft: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "bold" },
  reviewBtnSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 15,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  reviewBtnSuccessText: { color: "#059669", fontWeight: "bold", fontSize: 13 },
  reviewBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B5ED7",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 15,
    justifyContent: "center",
  },
  reviewBtnPrimaryText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
});
