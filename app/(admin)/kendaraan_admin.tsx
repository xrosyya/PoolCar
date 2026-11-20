import { FontAwesome } from "@expo/vector-icons";
// 🚀 DITAMBAHKAN: Import Stack dari expo-router
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

export default function KendaraanAdminScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams();
  const isFromDashboard = !!filter;
  const activeFilter = filter ? String(filter) : "Semua";

  const [kendaraan, setKendaraan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentFilter, setCurrentFilter] = useState(activeFilter);

  const [jenisKendaraan, setJenisKendaraan] = useState("");
  const [noPolisi, setNoPolisi] = useState("");
  const [pengemudi, setPengemudi] = useState("");
  const [unitAsal, setUnitAsal] = useState("");

  const fetchKendaraan = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "tb_kendaraan"));
      const list = querySnapshot.docs.map((docSnap) => ({
        id_kendaraan: docSnap.id,
        ...docSnap.data(),
      }));
      setKendaraan(list);
      setLoading(false);
    } catch (err) {
      console.error("Error ambil data kendaraan:", err);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchKendaraan();
    }, []),
  );

  useEffect(() => {
    if (filter) setCurrentFilter(String(filter));
  }, [filter]);

  const handleTambahKendaraan = async () => {
    if (!jenisKendaraan || !noPolisi || !pengemudi) {
      Alert.alert(
        "Gagal",
        "Mohon lengkapi Jenis Kendaraan, No Polisi, dan Nama Driver!",
      );
      return;
    }

    try {
      await addDoc(collection(db, "tb_kendaraan"), {
        jenis_kendaraan: jenisKendaraan,
        no_polisi: noPolisi,
        pengemudi: pengemudi,
        status: "Tersedia",
        unit: unitAsal.trim() || "Kantor Pusat",
        timestamp: new Date().toISOString(),
      });

      Alert.alert("Berhasil", "Armada baru berhasil ditambahkan.");
      setJenisKendaraan("");
      setNoPolisi("");
      setPengemudi("");
      setUnitAsal("");
      fetchKendaraan();
    } catch (err) {
      console.error("Error tambah kendaraan:", err);
      Alert.alert("Gagal", "Gagal menyimpan armada baru.");
    }
  };

  const handleUbahStatus = async (id_kendaraan: string, statusBaru: string) => {
    try {
      const kendaraanRef = doc(db, "tb_kendaraan", id_kendaraan);
      await updateDoc(kendaraanRef, { status: statusBaru });
      fetchKendaraan();
    } catch (err) {
      console.error("Error update status kendaraan:", err);
      Alert.alert("Gagal", "Gagal mengubah status kendaraan.");
    }
  };

  const totalKendaraan = kendaraan.length;
  const totalTersedia = kendaraan.filter(
    (car) => car.status === "Tersedia",
  ).length;
  const totalDipakai = kendaraan.filter(
    (car) => car.status === "Dipakai",
  ).length;

  // 🚀 DIPERBAIKI: Logika disamakan dengan fungsi filter di bawahnya
  const totalServis = kendaraan.filter(
    (car) =>
      car.status &&
      (car.status.toLowerCase().includes("bengkel") ||
        car.status.toLowerCase().includes("servis") ||
        car.status.toLowerCase().includes("rusak") ||
        car.status.toLowerCase().includes("perbaikan")),
  ).length;

  const filteredKendaraan = kendaraan.filter((car) => {
    const statusMobil = car.status ? car.status.toLowerCase() : "";
    if (currentFilter === "Tersedia") return statusMobil.includes("tersedia");
    if (currentFilter === "Dipakai") return statusMobil.includes("dipakai");
    if (currentFilter === "Bengkel") {
      return (
        statusMobil.includes("bengkel") ||
        statusMobil.includes("rusak") ||
        statusMobil.includes("servis") ||
        statusMobil.includes("perbaikan")
      );
    }
    return true;
  });

  const groupedCars = filteredKendaraan.reduce((groups: any, car: any) => {
    const unitName = car.unit ? String(car.unit).trim() : "Kantor Pusat";
    if (!groups[unitName]) {
      groups[unitName] = [];
    }
    groups[unitName].push(car);
    return groups;
  }, {});

  const sortedUnitKeys = Object.keys(groupedCars).sort((a, b) => {
    const lowerA = a.toLowerCase();
    const lowerB = b.toLowerCase();
    if (lowerA.includes("Pool")) return -1;
    if (lowerB.includes("Pool")) return 1;
    return a.localeCompare(b);
  });

  return (
    <View style={styles.container}>
      {/* 🚀 DITAMBAHKAN: Menyembunyikan header bawaan agar tidak tumpang tindih */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFromDashboard
            ? `Daftar Armada (${currentFilter})`
            : "Kelola Armada & Driver"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0B5ED7"
          style={{ marginTop: 50 }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {!isFromDashboard && (
            <>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Tambah Armada Baru</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jenis Kendaraan (Cth: Avanza / Hilux)"
                  placeholderTextColor="#94A3B8"
                  value={jenisKendaraan}
                  onChangeText={setJenisKendaraan}
                />
                <TextInput
                  style={styles.input}
                  placeholder="No Polisi (Cth: R 1234 AB)"
                  placeholderTextColor="#94A3B8"
                  value={noPolisi}
                  onChangeText={setNoPolisi}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nama Driver"
                  placeholderTextColor="#94A3B8"
                  value={pengemudi}
                  onChangeText={setPengemudi}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Sub Unit / Tempat (Cth: Pusat/ Bandung)"
                  placeholderTextColor="#94A3B8"
                  value={unitAsal}
                  onChangeText={setUnitAsal}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleTambahKendaraan}
                >
                  <Text style={styles.addBtnText}>Simpan Armada</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Filter Tampilan Armada</Text>

              <View style={styles.summaryContainer}>
                <TouchableOpacity
                  style={[
                    styles.summaryCard,
                    { borderLeftColor: "#3B82F6" },
                    currentFilter === "Semua" && styles.activeCardFilter,
                  ]}
                  onPress={() => setCurrentFilter("Semua")}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.summaryLabel}>TOTAL ARMADA</Text>
                    <Text style={styles.summaryValue}>{totalKendaraan}</Text>
                  </View>
                  <View
                    style={[
                      styles.summaryIconBox,
                      { backgroundColor: "#EFF6FF" },
                    ]}
                  >
                    <FontAwesome name="car" size={20} color="#3B82F6" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.summaryCard,
                    { borderLeftColor: "#10B981" },
                    currentFilter === "Tersedia" && styles.activeCardFilter,
                  ]}
                  onPress={() => setCurrentFilter("Tersedia")}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.summaryLabel}>TERSEDIA</Text>
                    <Text style={styles.summaryValue}>{totalTersedia}</Text>
                  </View>
                  <View
                    style={[
                      styles.summaryIconBox,
                      { backgroundColor: "#ECFDF5" },
                    ]}
                  >
                    <FontAwesome
                      name="check-circle"
                      size={20}
                      color="#10B981"
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.summaryContainer}>
                <TouchableOpacity
                  style={[
                    styles.summaryCard,
                    { borderLeftColor: "#EF4444" },
                    currentFilter === "Dipakai" && styles.activeCardFilter,
                  ]}
                  onPress={() => setCurrentFilter("Dipakai")}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.summaryLabel}>SEDANG DIPAKAI</Text>
                    <Text style={styles.summaryValue}>{totalDipakai}</Text>
                  </View>
                  <View
                    style={[
                      styles.summaryIconBox,
                      { backgroundColor: "#FEF2F2" },
                    ]}
                  >
                    <FontAwesome name="bolt" size={20} color="#EF4444" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.summaryCard,
                    { borderLeftColor: "#F59E0B" },
                    currentFilter === "Bengkel" && styles.activeCardFilter,
                  ]}
                  onPress={() => setCurrentFilter("Bengkel")}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.summaryLabel}>DI BENGKEL</Text>
                    <Text style={styles.summaryValue}>{totalServis}</Text>
                  </View>
                  <View
                    style={[
                      styles.summaryIconBox,
                      { backgroundColor: "#FFFBEB" },
                    ]}
                  >
                    <FontAwesome name="wrench" size={20} color="#F59E0B" />
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text
            style={[
              styles.sectionTitle,
              { marginTop: isFromDashboard ? 0 : 10 },
            ]}
          >
            Daftar Kendaraan & Kontrol Status
          </Text>

          {/* --- RENDER BERDASARKAN FILTER & UNIT --- */}
          {sortedUnitKeys.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome
                name="car"
                size={40}
                color="#CBD5E1"
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.emptyText}>
                Tidak ada kendaraan dengan status "{currentFilter}" saat ini.
              </Text>
            </View>
          ) : (
            sortedUnitKeys.map((unitName) => (
              <View key={unitName} style={styles.unitSection}>
                <View style={styles.unitHeaderBox}>
                  <FontAwesome
                    name="building"
                    size={15}
                    color="#0B5ED7"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.unitHeaderText}>
                    Unit / Tempat: {unitName}
                  </Text>
                </View>

                {groupedCars[unitName].map((item: any) => {
                  const isTersedia = item.status === "Tersedia";
                  const isBengkel =
                    item.status?.toLowerCase().includes("bengkel") ||
                    item.status?.toLowerCase().includes("servis");

                  return (
                    <View key={item.id_kendaraan} style={styles.card}>
                      <View style={styles.row}>
                        <Text style={styles.carName}>
                          🚘 {item.jenis_kendaraan}
                        </Text>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: isTersedia
                                ? "#E8F5E9"
                                : isBengkel
                                  ? "#FEF3C7"
                                  : "#FFEEED",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color: isTersedia
                                  ? "#2E7D32"
                                  : isBengkel
                                    ? "#D97706"
                                    : "#C62828",
                              },
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.info}>
                        No Polisi: {item.no_polisi}
                      </Text>
                      <Text style={styles.info}>Driver: {item.pengemudi}</Text>

                      {/* TOMBOL AKSI CEPAT ADMIN UNTUK MENGUBAH STATUS */}
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[
                            styles.statusBtn,
                            {
                              backgroundColor: isTersedia
                                ? "#94A3B8"
                                : "#2E7D32",
                            },
                          ]}
                          disabled={isTersedia}
                          onPress={() =>
                            handleUbahStatus(item.id_kendaraan, "Tersedia")
                          }
                        >
                          <Text style={styles.statusBtnText}>Set Tersedia</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.statusBtn,
                            {
                              backgroundColor: isBengkel
                                ? "#94A3B8"
                                : "#D97706",
                            },
                          ]}
                          disabled={isBengkel}
                          onPress={() =>
                            handleUbahStatus(item.id_kendaraan, "Di Bengkel")
                          }
                        >
                          <Text style={styles.statusBtnText}>
                            Masuk Bengkel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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

  formCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    color: "#1E293B",
  },
  addBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 5,
  },
  addBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 15,
  },

  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  activeCardFilter: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 5,
  },
  summaryValue: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  summaryIconBox: {
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginBottom: 20,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  unitSection: {
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  unitHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
  },
  unitHeaderText: { fontSize: 15, fontWeight: "bold", color: "#072B69" },

  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  carName: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "bold" },
  info: { fontSize: 13, color: "#64748B", marginBottom: 2 },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  statusBtnText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
});
