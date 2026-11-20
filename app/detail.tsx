import { FontAwesome } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const getValidData = (val: any, fallback: string) => {
    if (!val || val === "null" || val === "undefined" || val === "")
      return fallback;
    return val;
  };

  const idPeminjaman = getValidData(params.id_peminjaman, "ID-000");
  const tujuan = getValidData(params.tujuan, "-");
  const tanggal = getValidData(params.tanggal, "-");
  const jam = getValidData(params.jam, "-");
  const jenisKendaraan = getValidData(
    params.jenis_kendaraan,
    "Belum ditentukan",
  );
  const status = getValidData(params.status, "-");
  const pengemudi = getValidData(params.pengemudi, "Menunggu penugasan");
  const keperluan = getValidData(params.keperluan, "Tidak ada catatan");
  const penumpang = getValidData(params.penumpang, "Tidak ada data");
  const asal = getValidData(params.asal, "Kantor");
  const alasanTolak = getValidData(params.alasan_tolak, "");

  const rating = Number(params.rating) || 0;
  const ulasan = getValidData(params.ulasan, "");

  // 👇 LOGIKA WARNA BADGE YANG LEBIH RAPI 👇
  let badgeBg = "#F1F5F9"; // Default Abu-abu
  let badgeText = "#475569";

  if (status === "Menunggu ACC") {
    badgeBg = "#FEF3C7"; // Kuning
    badgeText = "#D97706";
  } else if (status === "Ditolak") {
    badgeBg = "#FEF2F2"; // Merah
    badgeText = "#EF4444";
  } else if (status === "Selesai" || status === "Disetujui") {
    badgeBg = "#D1FAE5"; // Hijau
    badgeText = "#059669";
  }

  // DETEKSI NAMA MOBIL UNTUK GAMBAR
  const namaMobil = jenisKendaraan.toLowerCase();
  let carImage = require("../assets/images/logo.png"); // Fallback jika tidak match

  if (namaMobil.includes("byd")) {
    carImage = require("../assets/images/byd.png");
  } else if (namaMobil.includes("mg4")) {
    carImage = require("../assets/images/mobil_mg4.png");
  } else if (namaMobil.includes("hrv")) {
    carImage = require("../assets/images/hrv.png");
  } else if (namaMobil.includes("zenik") || namaMobil.includes("zenix")) {
    carImage = require("../assets/images/innova_zenix.png");
  } else if (namaMobil.includes("innova")) {
    carImage = require("../assets/images/innova.png");
  } else if (namaMobil.includes("veloz")) {
    carImage = require("../assets/images/veloz.png");
  } else if (namaMobil.includes("xpander")) {
    carImage = require("../assets/images/xpander.png");
  } else if (namaMobil.includes("hilux")) {
    carImage = require("../assets/images/hilux.png");
  } else if (namaMobil.includes("foton")) {
    carImage = require("../assets/images/foton.png");
  } else if (namaMobil.includes("kijang")) {
    carImage = require("../assets/images/kijang_super.png");
  } else if (namaMobil.includes("rangga")) {
    carImage = require("../assets/images/rangga.png");
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color="#072B69" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Peminjaman</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topCard}>
          <Image
            source={carImage}
            style={styles.carImage}
            resizeMode="contain"
          />
          <View style={styles.topCardInfo}>
            <Text style={styles.cardTitleCode}>{tujuan.toUpperCase()}</Text>
            <Text style={styles.cardDate}>
              {tanggal} • {jam} WIB
            </Text>

            <View style={styles.cardRowBottom}>
              <Text style={styles.cardCarName}>{jenisKendaraan}</Text>
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.badgeText, { color: badgeText }]}>
                  {status}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* KOTAK ALASAN DITOLAK */}
        {status === "Ditolak" && alasanTolak !== "" && (
          <View style={styles.rejectContainer}>
            <FontAwesome
              name="info-circle"
              size={20}
              color="#EF4444"
              style={{ marginRight: 12, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectTitle}>Alasan Penolakan Admin:</Text>
              <Text style={styles.rejectText}>{alasanTolak}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Rincian</Text>
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Kode Pesanan</Text>
            <Text style={styles.detailValue}>REQ-{idPeminjaman}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Unit</Text>
            <Text style={styles.detailValue}>{jenisKendaraan}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Driver</Text>
            <Text style={styles.detailValue}>{pengemudi}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rute</Text>
            <Text style={styles.detailValue}>
              {asal} ➔ {tujuan}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Keperluan</Text>
            <Text style={styles.detailValue}>{keperluan}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Penumpang</Text>
            <Text style={styles.detailValue}>{penumpang}</Text>
          </View>
        </View>

        {/* SECTION REVIEW (HANYA MUNCUL JIKA ADA RATING) */}
        {rating > 0 && (
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Ulasan Driver</Text>

            <View style={styles.starsContainer}>
              {/* 👇 LOGIKA BINTANG SETENGAH (HALF-STAR) 👇 */}
              {[1, 2, 3, 4, 5].map((star) => {
                let iconName = "star-o"; // Kosong
                if (rating >= star) {
                  iconName = "star"; // Penuh
                } else if (rating >= star - 0.5) {
                  iconName = "star-half-empty"; // Setengah (mendukung rata-rata desimal)
                }

                return (
                  <FontAwesome
                    key={star}
                    name={iconName as any}
                    size={30}
                    color={rating >= star - 0.5 ? "#F59E0B" : "#E2E8F0"}
                    style={{ marginHorizontal: 4 }}
                  />
                );
              })}
            </View>

            {ulasan !== "" && <Text style={styles.reviewText}>{ulasan}</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
  },
  backBtn: { padding: 5, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#072B69" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },

  topCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    alignItems: "center",
  },
  carImage: { width: 70, height: 50, marginRight: 15 },
  topCardInfo: { flex: 1 },
  cardTitleCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 4,
  },
  cardDate: { fontSize: 13, color: "#64748B", marginBottom: 8 },
  cardRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardCarName: { fontSize: 14, color: "#0B5ED7", fontWeight: "600" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "bold" },

  rejectContainer: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  rejectTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 4,
  },
  rejectText: {
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 15,
  },
  detailsContainer: { marginBottom: 20 },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: { flex: 1, fontSize: 14, color: "#64748B", fontWeight: "600" },
  detailValue: { flex: 1.5, fontSize: 14, color: "#1E293B", fontWeight: "600" },

  reviewSection: { alignItems: "center", marginTop: 10 },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  reviewText: {
    fontSize: 15,
    color: "#072B69",
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
