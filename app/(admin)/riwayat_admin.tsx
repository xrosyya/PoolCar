import { FontAwesome } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 👇 Cukup pakai FileSystem dan Sharing (Library XLSX dihapus biar gak crash) 👇
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

export default function RiwayatAdminScreen() {
  const router = useRouter();
  const [riwayatRaw, setRiwayatRaw] = useState<any[]>([]);
  const [riwayatFiltered, setRiwayatFiltered] = useState<any[]>([]);

  const [driverList, setDriverList] = useState<string[]>([]);
  const [selectedBulan, setSelectedBulan] = useState("Semua");
  const [selectedDriver, setSelectedDriver] = useState("Semua");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchRiwayat = async () => {
    try {
      const q = query(collection(db, "tb_peminjaman"));
      const querySnapshot = await getDocs(q);

      const list = querySnapshot.docs.map((docSnap) => ({
        id_peminjaman: docSnap.id,
        ...docSnap.data(),
      }));

      list.sort((a: any, b: any) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      const uniqueDrivers = new Set<string>();
      list.forEach((item: any) => {
        if (item.pengemudi) {
          uniqueDrivers.add(item.pengemudi);
        }
      });
      setDriverList(Array.from(uniqueDrivers));

      setRiwayatRaw(list);
      applyFilter(list, selectedBulan, selectedDriver);
    } catch (err) {
      console.error("Error ambil riwayat admin:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRiwayat();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRiwayat();
  };

  const applyFilter = (dataList: any[], bulan: string, driver: string) => {
    let filtered = dataList;

    if (bulan !== "Semua") {
      filtered = filtered.filter((item: any) => {
        if (!item.tanggal) return false;
        const parts = item.tanggal.split("/");
        if (parts.length === 3) {
          return parts[1] === bulan;
        }
        return false;
      });
    }

    if (driver !== "Semua") {
      filtered = filtered.filter((item: any) => item.pengemudi === driver);
    }

    setRiwayatFiltered(filtered);
  };

  const handleBulanChange = (val: string) => {
    setSelectedBulan(val);
    applyFilter(riwayatRaw, val, selectedDriver);
  };

  const handleDriverChange = (val: string) => {
    setSelectedDriver(val);
    applyFilter(riwayatRaw, selectedBulan, val);
  };

  // 👇 FUNGSI DOWNLOAD BARU: DIUBAH KE FORMAT CSV AGAR 100% SUKSES DI ANDROID 👇
  const exportToExcel = async () => {
    if (riwayatFiltered.length === 0) {
      Alert.alert("Kosong", "Tidak ada data riwayat yang bisa di-export.");
      return;
    }

    setIsExporting(true);

    try {
      // 1. Siapkan Judul Kolom (Header)
      const header = [
        "No",
        "Tanggal",
        "Jam",
        "Peminjam",
        "Unit",
        "Divisi",
        "Tujuan",
        "Keperluan",
        "Mobil",
        "No Polisi",
        "Driver",
        "Status",
        "Alasan Tolak",
        "Rating",
        "Ulasan Teks",
      ];

      // Fungsi untuk mengamankan teks yang mengandung koma (misal: keperluan panjang)
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      // 2. Kumpulkan baris data
      const rowStrings = [header.join(",")];

      riwayatFiltered.forEach((item, index) => {
        const row = [
          index + 1,
          escapeCsv(item.tanggal || "-"),
          escapeCsv(item.jam || "-"),
          escapeCsv(item.nama_peminjam || "-"),
          escapeCsv(item.unit_peminjam || "-"),
          escapeCsv(item.divisi_peminjam || "-"),
          escapeCsv(item.tujuan || "-"),
          escapeCsv(item.keperluan || "-"),
          escapeCsv(item.jenis_kendaraan || "-"),
          escapeCsv(item.no_polisi || "-"),
          escapeCsv(item.pengemudi || "-"),
          escapeCsv(item.status || "-"),
          escapeCsv(item.alasan_tolak || "-"),
          escapeCsv(item.rating || "-"),
          escapeCsv(item.ulasan || "-"),
        ];
        rowStrings.push(row.join(","));
      });

      // 3. Gabungkan semua baris menjadi satu teks panjang
      const csvString = rowStrings.join("\n");
      const fileName = `Laporan_PoolCar_${Date.now()}.csv`;

      // 4. FIX ERROR TYPSCRIPT: Cek ketersediaan memori HP terlebih dahulu
      const folderUri = (FileSystem as any).documentDirectory;
      if (!folderUri) {
        Alert.alert("Error", "Gagal mengakses penyimpanan HP.");
        setIsExporting(false);
        return;
      }

      const uri = folderUri + fileName;

      await FileSystem.writeAsStringAsync(uri, csvString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 5. Munculkan jendela "Bagikan/Simpan" bawaan HP
      await Sharing.shareAsync(uri, {
        mimeType: "text/csv",
        dialogTitle: "Simpan Laporan PoolCar",
      });
    } catch (error: any) {
      console.error("Gagal export laporan:", error);
      Alert.alert("Error", "Gagal mengunduh laporan. Error: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <FontAwesome name="arrow-left" size={20} color="#003B73" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Laporan & Riwayat</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.filterArea}>
        <View style={styles.filterRow}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Filter Bulan:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedBulan}
                onValueChange={handleBulanChange}
                style={styles.picker}
              >
                <Picker.Item label="Semua Bulan" value="Semua" />
                <Picker.Item label="Januari" value="01" />
                <Picker.Item label="Februari" value="02" />
                <Picker.Item label="Maret" value="03" />
                <Picker.Item label="April" value="04" />
                <Picker.Item label="Mei" value="05" />
                <Picker.Item label="Juni" value="06" />
                <Picker.Item label="Juli" value="07" />
                <Picker.Item label="Agustus" value="08" />
                <Picker.Item label="September" value="09" />
                <Picker.Item label="Oktober" value="10" />
                <Picker.Item label="November" value="11" />
                <Picker.Item label="Desember" value="12" />
              </Picker>
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Filter Driver:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedDriver}
                onValueChange={handleDriverChange}
                style={styles.picker}
              >
                <Picker.Item label="Semua Driver" value="Semua" />
                {driverList.map((drv, idx) => (
                  <Picker.Item key={idx} label={drv} value={drv} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.exportBtn}
          activeOpacity={0.8}
          onPress={exportToExcel}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <FontAwesome
                name="file-text-o"
                size={16}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.exportBtnText}>Download Laporan (CSV)</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerCenter}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 10, color: "#64748B" }}>
            Memuat riwayat data...
          </Text>
        </View>
      ) : riwayatFiltered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Tidak ada riwayat perjalanan yang cocok dengan filter.
          </Text>
        </View>
      ) : (
        <FlatList
          data={riwayatFiltered}
          keyExtractor={(item: any) => String(item.id_peminjaman)}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563EB"]}
              tintColor={"#2563EB"}
            />
          }
          renderItem={({ item }) => {
            let badgeBg = "#E2E8F0";
            let badgeText = "#475569";

            if (item.status === "Selesai") {
              badgeBg = "#DCFCE7";
              badgeText = "#16A34A";
            } else if (item.status === "Disetujui") {
              badgeBg = "#DBEAFE";
              badgeText = "#2563EB";
            } else if (item.status === "Ditolak") {
              badgeBg = "#FEE2E2";
              badgeText = "#DC2626";
            }

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FontAwesome
                        name="user-circle"
                        size={16}
                        color="#64748B"
                      />
                      <Text style={styles.namaPeminjam}>
                        {item.nama_peminjam || "Pegawai"}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        marginTop: 2,
                        fontStyle: "italic",
                      }}
                    >
                      🏢 Unit: {item.unit_peminjam || "-"} | Divisi:{" "}
                      {item.divisi_peminjam || "-"}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.badgeText, { color: badgeText }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.tujuanText}>📍 {item.tujuan}</Text>
                  <Text style={styles.waktuText}>
                    📅 {item.tanggal} | 🕒 {item.jam}
                  </Text>

                  {item.status !== "Ditolak" && item.jenis_kendaraan && (
                    <View style={styles.armadaBox}>
                      <Text style={styles.armadaText}>
                        🚗 {item.jenis_kendaraan} ({item.no_polisi})
                      </Text>
                      <Text style={styles.driverText}>
                        Driver: {item.pengemudi}
                      </Text>
                    </View>
                  )}

                  {item.status === "Ditolak" && item.alasan_tolak && (
                    <View style={styles.rejectBox}>
                      <FontAwesome
                        name="info-circle"
                        size={16}
                        color="#EF4444"
                        style={{ marginRight: 8, marginTop: 2 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rejectTitle}>
                          Alasan Penolakan:
                        </Text>
                        <Text style={styles.rejectReason}>
                          {item.alasan_tolak}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
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
  },
  backBtn: { width: 30, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003B73",
    textAlign: "center",
  },
  filterArea: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    elevation: 2,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  pickerContainer: { 
    flex: 1, 
  },
  pickerLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "bold",
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
  },
  picker: { 
    height: 44, 
    width: "100%",
  },
  // Style khusus untuk mengatur tinggi teks item di iOS agar pas di tengah kotak
  pickerItem: {
    height: 44,
    fontSize: 13,
    color: "#334155",
  },
  exportBtn: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  exportBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  centerCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 20,
    marginHorizontal: 20,
  },
  emptyText: { color: "#64748B", fontStyle: "italic", textAlign: "center" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  namaPeminjam: { fontSize: 14, fontWeight: "bold", color: "#334155" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "bold" },
  cardBody: { padding: 15 },
  tujuanText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  waktuText: { fontSize: 13, color: "#64748B", marginBottom: 12 },
  armadaBox: {
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  armadaText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 2,
  },
  driverText: { fontSize: 12, color: "#3B82F6" },
  rejectBox: {
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    flexDirection: "row",
  },
  rejectTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 2,
  },
  rejectReason: {
    fontSize: 12,
    color: "#991B1B",
  },
});
