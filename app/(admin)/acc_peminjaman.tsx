import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  urlPath: string,
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: { url: urlPath },
  };

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Gagal mengirim Push Notifikasi:", error);
  }
}

const carImages: { [key: string]: any } = {
  bmwm4: require("../../assets/images/bmwm4.png"),
  pajero: require("../../assets/images/pajero.png"),
  byd: require("../../assets/images/byd.png"),
  foton: require("../../assets/images/foton.png"),
  hilux: require("../../assets/images/hilux.png"),
  hrv: require("../../assets/images/hrv.png"),
  innova: require("../../assets/images/innova.png"),
  innova_zenix: require("../../assets/images/innova_zenix.png"),
  kijang_super: require("../../assets/images/kijang_super.png"),
  mobil_mg4: require("../../assets/images/mobil_mg4.png"),
  rangga: require("../../assets/images/rangga.png"),
  veloz: require("../../assets/images/veloz.png"),
  xpander: require("../../assets/images/xpander.png"),
  default: require("../../assets/images/innova.png"),
};

const getCarImage = (jenis: string) => {
  if (!jenis) return carImages.default;
  const type = jenis.toLowerCase();

  if (type.includes("byd")) return carImages.byd;
  if (type.includes("bmw") || type.includes("m4")) return carImages.bmwm4;
  if (type.includes("pajero")) return carImages.pajero;
  if (type.includes("foton")) return carImages.foton;
  if (
    type.includes("hilux") ||
    type.includes("pickup") ||
    type.includes("double")
  )
    return carImages.hilux;
  if (type.includes("hrv")) return carImages.hrv;
  if (type.includes("zenix")) return carImages.innova_zenix;
  if (type.includes("innova")) return carImages.innova;
  if (type.includes("kijang")) return carImages.kijang_super;
  if (type.includes("mg4")) return carImages.mobil_mg4;
  if (type.includes("rangga")) return carImages.rangga;
  if (type.includes("veloz")) return carImages.veloz;
  if (type.includes("xpander")) return carImages.xpander;

  return carImages.default;
};

// FIX: Helper komparasi tanggal yang robust
const isBookingForToday = (bookingDateStr: string) => {
  if (!bookingDateStr) return false;
  const today = new Date();
  const d = String(today.getDate());
  const dd = d.padStart(2, "0");
  const m = String(today.getMonth() + 1);
  const mm = m.padStart(2, "0");
  const yyyy = String(today.getFullYear());

  const target = bookingDateStr.trim();
  const validFormats = [
    `${dd}/${mm}/${yyyy}`,
    `${dd}-${mm}-${yyyy}`,
    `${d}/${m}/${yyyy}`,
    `${d}-${m}-${yyyy}`,
    `${yyyy}-${mm}-${dd}`,
  ];

  return validFormats.includes(target);
};

export default function AccPeminjamanScreen() {
  const router = useRouter();
  const { id_peminjaman, tujuan } = useLocalSearchParams();

  const [kendaraanList, setKendaraanList] = useState<any[]>([]);
  const [driverList, setDriverList] = useState<any[]>([]);

  const [selectedKendaraan, setSelectedKendaraan] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  const [namaPeminjam, setNamaPeminjam] = useState("");
  const [tanggalPeminjaman, setTanggalPeminjaman] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const querySnapshot = await getDocs(collection(db, "tb_kendaraan"));
        const list = querySnapshot.docs.map((docSnap) => ({
          id_kendaraan: docSnap.id,
          ...docSnap.data(),
        }));
        const tersedia = list.filter(
          (k: any) => k.status && k.status.toLowerCase().includes("tersedia"),
        );
        setKendaraanList(tersedia);

        const driverSnap = await getDocs(collection(db, "tb_driver"));
        const drivers = driverSnap.docs.map((docSnap) => ({
          id_driver: docSnap.id,
          ...docSnap.data(),
        }));
        setDriverList(drivers);

        if (id_peminjaman && id_peminjaman !== "-") {
          const peminjamanRef = doc(db, "tb_peminjaman", String(id_peminjaman));
          const peminjamanSnap = await getDoc(peminjamanRef);
          if (peminjamanSnap.exists()) {
            setNamaPeminjam(peminjamanSnap.data().nama_peminjam || "");
            setTanggalPeminjaman(peminjamanSnap.data().tanggal || "");
          }
        }
      } catch (err) {
        console.error("Error ambil data:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [id_peminjaman]);

  const groupedCars = kendaraanList.reduce((groups: any, car: any) => {
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

  const handleProsesAcc = async () => {
    if (!selectedKendaraan || !selectedDriver) {
      Alert.alert(
        "Peringatan",
        "Silakan pilih Armada Mobil dan Driver yang bertugas terlebih dahulu!",
      );
      return;
    }

    if (!id_peminjaman || id_peminjaman === "-") {
      Alert.alert("Error", "ID Peminjaman tidak valid.");
      return;
    }

    setIsSubmitting(true);

    try {
      const peminjamanRef = doc(db, "tb_peminjaman", String(id_peminjaman));
      const namaDriverTujuan =
        selectedDriver.nama_driver ||
        selectedDriver.nama ||
        selectedDriver.id_driver;

      await updateDoc(peminjamanRef, {
        status: "Disetujui",
        id_kendaraan: selectedKendaraan.id_kendaraan,
        jenis_kendaraan: selectedKendaraan.jenis_kendaraan,
        no_polisi: selectedKendaraan.no_polisi,
        pengemudi: namaDriverTujuan,
      });

      // FIX: Cek tanggal memakai fungsi helper
      if (isBookingForToday(tanggalPeminjaman)) {
        const kendaraanRef = doc(
          db,
          "tb_kendaraan",
          selectedKendaraan.id_kendaraan,
        );
        await updateDoc(kendaraanRef, {
          status: "Dipakai",
        });
      }

      if (namaDriverTujuan) {
        // FIX: lowercase agar match dengan ID token
        const driverSafeId = namaDriverTujuan
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_");
        const tokenRef = doc(db, "tb_driver_tokens", driverSafeId);
        const tokenSnap = await getDoc(tokenRef);

        if (tokenSnap.exists() && tokenSnap.data().expoPushToken) {
          await sendPushNotification(
            tokenSnap.data().expoPushToken,
            "🚗 Tugas Perjalanan Baru!",
            `Admin telah menugaskan Anda menggunakan ${selectedKendaraan.jenis_kendaraan} untuk tujuan: ${tujuan}.`,
            "/(driver)",
          );
        }
      }

      if (namaPeminjam) {
        // FIX: lowercase agar match dengan ID token pegawai
        const namaAman = namaPeminjam.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const pegawaiTokenRef = doc(db, "tb_pegawai_tokens", namaAman);
        const pegawaiTokenSnap = await getDoc(pegawaiTokenRef);

        if (
          pegawaiTokenSnap.exists() &&
          pegawaiTokenSnap.data().expoPushToken
        ) {
          await sendPushNotification(
            pegawaiTokenSnap.data().expoPushToken,
            "🎉 Hore, Pesanan Di-ACC!",
            `Pengajuan kendaraan ke ${tujuan} disetujui. Driver ${namaDriverTujuan} siap mengantar pada ${tanggalPeminjaman}.`,
            "/(tabs)",
          );
        }
      }

      setIsSubmitting(false);
      Alert.alert(
        "Berhasil",
        "Peminjaman disetujui. Notifikasi telah dikirim.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      setIsSubmitting(false);
      console.error("Error ACC Peminjaman:", err);
      Alert.alert("Error", "Gagal menyimpan persetujuan.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alokasi Pesanan</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoadingData ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#0B5ED7" />
          <Text style={{ marginTop: 10, color: "#64748B" }}>
            Menyiapkan Data...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <FontAwesome name="map-marker" size={16} color="#0B5ED7" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Tujuan Perjalanan</Text>
                <Text style={styles.infoValue}>{tujuan}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: "#FEF2F2" }]}>
                <FontAwesome name="calendar" size={14} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Jadwal Keberangkatan</Text>
                <Text style={styles.infoValue}>{tanggalPeminjaman}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Pilih Armada Mobil</Text>
          </View>

          {kendaraanList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Tidak ada armada yang 'Tersedia' saat ini.
              </Text>
            </View>
          ) : (
            sortedUnitKeys.map((unit) => (
              <View key={unit} style={styles.unitContainer}>
                <View style={styles.unitHeaderBox}>
                  <FontAwesome
                    name="building"
                    size={14}
                    color="#0B5ED7"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.unitHeaderText}>
                    Area Sub-Unit: {unit}
                  </Text>
                </View>

                {groupedCars[unit].map((item: any) => {
                  const isSelected =
                    selectedKendaraan?.id_kendaraan === item.id_kendaraan;
                  return (
                    <TouchableOpacity
                      key={item.id_kendaraan}
                      style={[
                        styles.carCard,
                        isSelected && styles.carCardSelected,
                      ]}
                      onPress={() => setSelectedKendaraan(item)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.carImageContainer}>
                        <Image
                          source={getCarImage(item.jenis_kendaraan)}
                          style={styles.carImg}
                        />
                      </View>

                      <View style={styles.carInfo}>
                        <Text style={styles.carName}>
                          {item.jenis_kendaraan}
                        </Text>
                        <View style={styles.platBadge}>
                          <Text style={styles.platText}>{item.no_polisi}</Text>
                        </View>
                        <Text style={styles.carDefaultDriver}>
                          <FontAwesome name="user-circle" size={10} /> Biasa
                          dibawa: {item.pengemudi || "-"}
                        </Text>
                      </View>

                      <View style={styles.radioBtn}>
                        {isSelected ? (
                          <FontAwesome
                            name="dot-circle-o"
                            size={24}
                            color="#0B5ED7"
                          />
                        ) : (
                          <FontAwesome
                            name="circle-o"
                            size={24}
                            color="#CBD5E1"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}

          <View style={[styles.sectionHeader, { marginTop: 15 }]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Tugaskan Driver</Text>
          </View>

          {driverList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Memuat data driver...</Text>
            </View>
          ) : (
            <View style={styles.driverGrid}>
              {driverList.map((item) => {
                const namaDriver =
                  item.nama_driver || item.nama || item.id_driver;
                const isSelected = selectedDriver?.id_driver === item.id_driver;
                const unitDriver =
                  item.unit || item.unit_kerja || "Kantor Pusat";

                return (
                  <TouchableOpacity
                    key={item.id_driver}
                    style={[
                      styles.driverCard,
                      isSelected && styles.driverCardSelected,
                    ]}
                    onPress={() => setSelectedDriver(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.driverAvatar}>
                      <FontAwesome
                        name="user"
                        size={18}
                        color={isSelected ? "#0B5ED7" : "#94A3B8"}
                      />
                    </View>

                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text
                        style={[
                          styles.driverName,
                          isSelected && {
                            color: "#0B5ED7",
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {namaDriver}
                      </Text>
                      <Text
                        style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}
                      >
                        🏢 Unit: {unitDriver}
                      </Text>
                    </View>

                    <View style={styles.radioBtn}>
                      {isSelected ? (
                        <FontAwesome
                          name="check-circle"
                          size={22}
                          color="#0B5ED7"
                        />
                      ) : (
                        <FontAwesome
                          name="circle-thin"
                          size={22}
                          color="#CBD5E1"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!selectedKendaraan || !selectedDriver || isSubmitting) && {
                backgroundColor: "#94A3B8",
              },
            ]}
            onPress={handleProsesAcc}
            disabled={!selectedKendaraan || !selectedDriver || isSubmitting}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? "Memproses..." : "Setujui Peminjaman Ini"}
            </Text>
            {!isSubmitting && (
              <FontAwesome
                name="paper-plane"
                size={14}
                color="#FFF"
                style={{ marginLeft: 10 }}
              />
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
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
    fontSize: 17,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    flex: 1,
  },
  scrollContent: { padding: 20 },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
    marginLeft: 48,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0B5ED7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  stepText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  unitContainer: { marginBottom: 20 },
  unitHeaderBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 5,
  },
  unitHeaderText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  carCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  carCardSelected: {
    borderColor: "#0B5ED7",
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
  },
  carImageContainer: {
    width: 70,
    height: 50,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  carImg: { width: 65, height: 45, resizeMode: "contain" },
  carInfo: { flex: 1, justifyContent: "center" },
  carName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  platBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 4,
  },
  platText: { fontSize: 11, fontWeight: "bold", color: "#475569" },
  carDefaultDriver: { fontSize: 10, color: "#94A3B8", fontStyle: "italic" },
  driverGrid: { marginBottom: 20 },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  driverCardSelected: {
    borderColor: "#0B5ED7",
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverName: { fontSize: 14, color: "#334155", fontWeight: "500" },
  radioBtn: { paddingHorizontal: 5 },
  emptyCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyText: {
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: "#0B5ED7",
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    elevation: 3,
  },
  submitBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
});
