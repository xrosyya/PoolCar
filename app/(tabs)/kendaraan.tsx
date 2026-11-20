import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

export default function KendaraanScreen() {
  const { filter } = useLocalSearchParams();
  const activeFilter = filter ? String(filter) : "Semua";

  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState(activeFilter);

  // --- AMBIL DATA KENDARAAN SECARA REAL-TIME ---
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "tb_kendaraan"),
      (snapshot) => {
        const daftarKendaraan = snapshot.docs.map((doc) => ({
          id_kendaraan: doc.id,
          ...doc.data(),
        }));
        setCars(daftarKendaraan);
        setLoading(false);
      },
      (error) => {
        console.error("Gagal mengambil data real-time:", error);
        setLoading(false);
      },
    );

    // Membersihkan listener saat keluar halaman
    return () => unsubscribe();
  }, []);

  // Update filter aktif kalau pindah dari Dasbor
  useEffect(() => {
    if (filter) setCurrentFilter(String(filter));
  }, [filter]);

  // --- LOGIKA PERHITUNGAN SUMMARY CARDS (DISAMAKAN DENGAN DASBOR) ---
  const totalKendaraan = cars.length;

  const totalTersedia = cars.filter(
    (car) => car.status && car.status.toLowerCase().includes("tersedia"),
  ).length;

  const totalDipakai = cars.filter(
    (car) => car.status && car.status.toLowerCase().includes("dipakai"),
  ).length;

  const totalServis = cars.filter((car) => {
    const s = car.status ? car.status.toLowerCase() : "";
    return (
      s.includes("bengkel") ||
      s.includes("rusak") ||
      s.includes("servis") ||
      s.includes("perbaikan") ||
      s.includes("maintenance")
    );
  }).length;

  // --- LOGIKA FILTER DATA UNTUK DITAMPILKAN ---
  const filteredCars = cars.filter((car) => {
    const statusMobil = car.status ? car.status.toLowerCase() : "";

    if (currentFilter === "Tersedia") return statusMobil.includes("tersedia");
    if (currentFilter === "Dipakai") return statusMobil.includes("dipakai");
    if (currentFilter === "Bengkel") {
      return (
        statusMobil.includes("bengkel") ||
        statusMobil.includes("rusak") ||
        statusMobil.includes("servis") ||
        statusMobil.includes("perbaikan") ||
        statusMobil.includes("maintenance")
      );
    }
    return true; // Kalau filternya "Semua", tampilkan semua
  });

  // --- PENGELOMPOKAN BERDASARKAN UNIT ---
  const groupedCars = filteredCars.reduce((groups: any, car: any) => {
    const unitName = car.unit ? String(car.unit).trim() : "Lainnya";
    if (!groups[unitName]) {
      groups[unitName] = [];
    }
    groups[unitName].push(car);
    return groups;
  }, {});

  const sortedUnitKeys = Object.keys(groupedCars).sort((a, b) => {
    const lowerA = a.toLowerCase();
    const lowerB = b.toLowerCase();

    // Jika A adalah "Kantor", taruh di atas
    if (lowerA.includes("kantor")) return -1;
    // Jika B adalah "Kantor", taruh di atas
    if (lowerB.includes("kantor")) return 1;

    // Sisanya (seperti Cabang1, Cabang2, dll) diurutkan sesuai abjad A-Z
    return a.localeCompare(b);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ketersediaan Armada</Text>
          <Text style={styles.subtitle}>
            Diperbarui secara Live (Real-Time)
          </Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
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
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* --- SUMMARY CARDS --- */}
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
                style={[styles.summaryIconBox, { backgroundColor: "#EFF6FF" }]}
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
                <Text style={styles.summaryLabel}>TERSEDIA (LIVE)</Text>
                <Text style={styles.summaryValue}>{totalTersedia}</Text>
              </View>
              <View
                style={[styles.summaryIconBox, { backgroundColor: "#ECFDF5" }]}
              >
                <FontAwesome name="check-circle" size={20} color="#10B981" />
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
                style={[styles.summaryIconBox, { backgroundColor: "#FEF2F2" }]}
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
                style={[styles.summaryIconBox, { backgroundColor: "#FFFBEB" }]}
              >
                <FontAwesome name="wrench" size={20} color="#F59E0B" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.noteBox}>
            <FontAwesome
              name="info-circle"
              size={16}
              color="#3B82F6"
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text style={styles.noteText}>
              Status{" "}
              <Text style={{ fontWeight: "bold", color: "#10B981" }}>
                Tersedia
              </Text>{" "}
              berarti mobil siap dipesan.{" "}
              <Text style={{ fontWeight: "bold", color: "#EF4444" }}>
                Dipakai
              </Text>{" "}
              berarti mobil sedang dalam perjalanan.{" "}
              <Text style={{ fontWeight: "bold", color: "#F59E0B" }}>
                Di Bengkel
              </Text>{" "}
              berarti mobil sedang perbaikan.
            </Text>
          </View>

          {/* MENAMPILKAN DATA SESUAI FILTER */}
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
            sortedUnitKeys.map((unit) => (
              <View key={unit} style={styles.unitSection}>
                <View style={styles.unitHeaderBox}>
                  <FontAwesome
                    name="building"
                    size={16}
                    color="#475569"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.unitHeaderText}>
                    Unit / Tempat: {unit}
                  </Text>
                </View>

                <View style={styles.listContainer}>
                  {groupedCars[unit].map((car: any) => {
                    const statusKendaraan = car.status
                      ? car.status.toLowerCase()
                      : "";
                    let badgeBg = "#FEE2E2";
                    let badgeText = "#EF4444";

                    if (statusKendaraan.includes("tersedia")) {
                      badgeBg = "#D1FAE5";
                      badgeText = "#10B981";
                    } else if (
                      statusKendaraan.includes("bengkel") ||
                      statusKendaraan.includes("rusak") ||
                      statusKendaraan.includes("perbaikan") ||
                      statusKendaraan.includes("servis") ||
                      statusKendaraan.includes("maintenance")
                    ) {
                      badgeBg = "#FFEDD5";
                      badgeText = "#F97316";
                    }

                    return (
                      <TouchableOpacity
                        key={car.id_kendaraan}
                        style={styles.listCard}
                        activeOpacity={0.7}
                        onPress={() =>
                          alert(
                            `Pengemudi: ${car.pengemudi}\nPlat: ${car.no_polisi}\nStatus: ${car.status}`,
                          )
                        }
                      >
                        <View style={styles.imagePlaceholder}>
                          {(() => {
                            const namaMobil = car.jenis_kendaraan
                              ? car.jenis_kendaraan.toLowerCase()
                              : "";
                            let carImage = require("../../assets/images/logo.png");

                            if (namaMobil.includes("byd"))
                              carImage = require("../../assets/images/byd.png");
                            else if (
                              namaMobil.includes("bmw") ||
                              namaMobil.includes("m4")
                            )
                              carImage = require("../../assets/images/bmwm4.png");
                            else if (namaMobil.includes("pajero"))
                              carImage = require("../../assets/images/pajero.png");
                            else if (namaMobil.includes("mg4"))
                              carImage = require("../../assets/images/mobil_mg4.png");
                            else if (namaMobil.includes("hrv"))
                              carImage = require("../../assets/images/hrv.png");
                            else if (
                              namaMobil.includes("zenik") ||
                              namaMobil.includes("zenix")
                            )
                              carImage = require("../../assets/images/innova_zenix.png");
                            else if (namaMobil.includes("innova"))
                              carImage = require("../../assets/images/innova.png");
                            else if (namaMobil.includes("veloz"))
                              carImage = require("../../assets/images/veloz.png");
                            else if (namaMobil.includes("xpander"))
                              carImage = require("../../assets/images/xpander.png");
                            else if (namaMobil.includes("hilux"))
                              carImage = require("../../assets/images/hilux.png");
                            else if (namaMobil.includes("foton"))
                              carImage = require("../../assets/images/foton.png");
                            else if (namaMobil.includes("kijang"))
                              carImage = require("../../assets/images/kijang_super.png");
                            else if (namaMobil.includes("rangga"))
                              carImage = require("../../assets/images/rangga.png");

                            return (
                              <Image
                                source={carImage}
                                style={{
                                  width: 65,
                                  height: 65,
                                  resizeMode: "contain",
                                }}
                              />
                            );
                          })()}
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {car.jenis_kendaraan}
                          </Text>
                          <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {car.no_polisi} • {car.pengemudi || "Tanpa Driver"}
                          </Text>
                          <View
                            style={[styles.badge, { backgroundColor: badgeBg }]}
                          >
                            <Text
                              style={[styles.badgeLabel, { color: badgeText }]}
                            >
                              {car.status}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 15 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#1E293B" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 5,
  },
  liveText: { fontSize: 11, fontWeight: "bold", color: "#10B981" },
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
  noteBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 4,
    marginTop: 5,
    marginBottom: 25,
  },
  noteText: { flex: 1, fontSize: 12, color: "#334155", lineHeight: 18 },
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
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  unitSection: {
    marginBottom: 25,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  unitHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
  },
  unitHeaderText: { fontSize: 16, fontWeight: "bold", color: "#334155" },
  listContainer: { flexDirection: "column" },
  listCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  imagePlaceholder: {
    width: 75,
    height: 75,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1, marginLeft: 15, justifyContent: "center" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
    fontWeight: "500",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeLabel: { fontSize: 11, fontWeight: "bold" },
});
