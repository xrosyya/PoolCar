import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Image,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import * as Notifications from "expo-notifications";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Aplikasi butuh izin notifikasi!");
      return;
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "af1503b4-2d07-4bb4-9c3c-147f3757dfb5",
      })
    ).data;
  }
  return token;
}

export default function DriverDashboardScreen() {
  const router = useRouter();

  const [namaDriverLogin, setNamaDriverLogin] = useState("");
  const [lokasiInterval, setLokasiInterval] = useState<any>(null);
  const [jadwalAktif, setJadwalAktif] = useState<any[]>([]);
  const [riwayatList, setRiwayatList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isInitialMount = useRef(true);
  const prevAktifCount = useRef(0);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await AsyncStorage.getItem("userSession");
        if (session) {
          const parsed = JSON.parse(session);
          setNamaDriverLogin(parsed.nama_driver || "");
        }
      } catch (err) {
        console.error("Gagal baca sesi driver:", err);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      Alert.alert(
        "Keluar Aplikasi",
        "Apakah Anda yakin ingin keluar dari aplikasi?",
        [
          { text: "Batal", style: "cancel", onPress: () => {} },
          {
            text: "Ya, Keluar",
            style: "destructive",
            onPress: () => BackHandler.exitApp(),
          },
        ],
      );
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (!namaDriverLogin) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        try {
          const tokenRef = doc(db, "tb_driver_tokens", namaDriverLogin);
          await setDoc(
            tokenRef,
            {
              expoPushToken: token,
              nama_driver: namaDriverLogin,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        } catch (err) {
          console.error("Gagal simpan token:", err);
        }
      }
    });

    setLoading(true);

    const q = query(collection(db, "tb_peminjaman"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id_peminjaman: docSnap.id,
          ...docSnap.data(),
        }));

        const myJobs = list.filter((item: any) => {
          if (!item.pengemudi) return false;
          const namaDiDB = String(item.pengemudi).toLowerCase().trim();
          const namaDiMemori = String(namaDriverLogin).toLowerCase().trim();
          return (
            namaDiDB.includes(namaDiMemori) || namaDiMemori.includes(namaDiDB)
          );
        });

        const aktif = myJobs.filter((item: any) => item.status === "Disetujui");
        const selesai = myJobs.filter((item: any) => item.status === "Selesai");

        if (isInitialMount.current) {
          isInitialMount.current = false;
        } else if (aktif.length > prevAktifCount.current) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: "🚗 Tugas Perjalanan Baru!",
              body: "Admin telah menyetujui peminjaman baru. Silakan cek detail penugasan.",
              sound: "default",
            },
            trigger: null,
          });
        }

        prevAktifCount.current = aktif.length;
        setJadwalAktif(aktif);
        setRiwayatList(selesai);
        setLoading(false);
      },
      (err) => {
        console.error("Error real-time driver listener:", err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [namaDriverLogin]);

  const handleHubungiWA = (namaPeminjam: string, noWA: string) => {
    if (!noWA) {
      Alert.alert(
        "Gagal",
        "Nomor WhatsApp peminjam tidak ditemukan di sistem.",
      );
      return;
    }
    let nomorFormat = noWA;
    if (nomorFormat.startsWith("0")) {
      nomorFormat = "62" + nomorFormat.substring(1);
    }
    const pesan = `Halo Bapak/Ibu ${namaPeminjam}, saya driver yang ditugaskan mengantar Anda hari ini. Apakah sudah siap?`;
    const url = `https://wa.me/${nomorFormat}?text=${encodeURIComponent(pesan)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Gagal membuka WhatsApp."),
    );
  };

  const mulaiPerjalanan = async (id_peminjaman: string) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Izin Ditolak",
        "Aplikasi butuh akses lokasi untuk melacak perjalanan.",
      );
      return;
    }
    Alert.alert(
      "Perjalanan Dimulai",
      "GPS sedang melacak dan mengirim posisi Anda.",
    );
    const intervalId = setInterval(async () => {
      try {
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        const peminjamanRef = doc(db, "tb_peminjaman", id_peminjaman);
        await updateDoc(peminjamanRef, {
          latitude_driver: String(lat),
          longitude_driver: String(lng),
        });
      } catch (error) {
        console.log("Gagal membaca atau mengirim lokasi:", error);
      }
    }, 10000);
    setLokasiInterval(intervalId);
  };

  const matikanGPS = () => {
    if (lokasiInterval) {
      clearInterval(lokasiInterval);
      setLokasiInterval(null);
    }
  };

  // 👇 PERUBAHAN FUNGSI HANDLE SELESAI (POP-UP KEBERSIHAN) 👇
  const handleSelesai = (id_peminjaman: string, id_kendaraan: string) => {
    if (Platform.OS === "web") {
      const isConfirm = window.confirm(
        "Standar Operasional (SOP):\nApakah kondisi kendaraan sudah dibersihkan dan dirapikan kembali seperti semula sebelum diselesaikan?",
      );
      if (isConfirm) eksekusiSelesai(id_peminjaman, id_kendaraan);
    } else {
      Alert.alert(
        "Cek Kebersihan Armada ✨",
        "Standar Operasional (SOP):\nApakah kondisi kendaraan sudah dibersihkan dan dirapikan kembali seperti semula?",
        [
          { text: "Belum (Batal)", style: "cancel" },
          {
            text: "Sudah, Selesaikan!",
            onPress: () => eksekusiSelesai(id_peminjaman, id_kendaraan),
          },
        ],
      );
    }
  };

  const eksekusiSelesai = async (
    id_peminjaman: string,
    id_kendaraan: string,
  ) => {
    matikanGPS();
    try {
      const peminjamanRef = doc(db, "tb_peminjaman", id_peminjaman);

      const peminjamanSnap = await getDoc(peminjamanRef);
      let namaPeminjam = "";
      let tujuanPeminjaman = "";

      if (peminjamanSnap.exists()) {
        namaPeminjam = peminjamanSnap.data().nama_peminjam;
        tujuanPeminjaman = peminjamanSnap.data().tujuan;
      }

      await updateDoc(peminjamanRef, { status: "Selesai" });

      if (id_kendaraan) {
        const kendaraanRef = doc(db, "tb_kendaraan", id_kendaraan);
        await updateDoc(kendaraanRef, { status: "Tersedia" });
      }

      // KIRIM NOTIFIKASI KE PEGAWAI
      if (namaPeminjam) {
        const namaAman = namaPeminjam.replace(/[^a-zA-Z0-9]/g, "_");
        const pegawaiTokenRef = doc(db, "tb_pegawai_tokens", namaAman);
        const pegawaiTokenSnap = await getDoc(pegawaiTokenRef);

        if (pegawaiTokenSnap.exists()) {
          const pushTokenPegawai = pegawaiTokenSnap.data().expoPushToken;
          if (pushTokenPegawai) {
            await sendPushNotification(
              pushTokenPegawai,
              "✅ Perjalanan Selesai!",
              `Perjalanan ke ${tujuanPeminjaman} telah selesai. Jangan lupa berikan ulasan untuk armada dan driver Anda!`,
              "/(tabs)",
            );
          }
        }
      }

      if (Platform.OS === "web") {
        window.alert(
          "Perjalanan diselesaikan! Armada kembali tersedia dalam kondisi bersih.",
        );
      } else {
        Alert.alert(
          "Sukses",
          "Perjalanan diselesaikan! Armada kembali tersedia dalam kondisi bersih.",
        );
      }
    } catch (err) {
      console.error("Error selesaikan perjalanan:", err);
      Alert.alert("Error", "Gagal memperbarui status perjalanan.");
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const isConfirm = window.confirm(
        "Apakah Anda yakin ingin keluar dari akun?",
      );
      if (isConfirm) {
        AsyncStorage.removeItem("userSession").then(() => {
          router.replace("/auth");
        });
      }
    } else {
      Alert.alert(
        "Konfirmasi Logout",
        "Apakah Anda yakin ingin keluar dari akun?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Keluar",
            style: "destructive",
            onPress: async () => {
              await AsyncStorage.removeItem("userSession");
              router.replace("/auth");
            },
          },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topHeader}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.headerLogoImg}
          />
          <View>
            <Text style={styles.logoText}>
              Pool<Text style={{ color: "#0B5ED7" }}>Car</Text>
            </Text>
            <Text style={styles.logoSubText}>Sistem Operasional</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>
            Halo, Driver {namaDriverLogin} 🚗
          </Text>
          <Text style={styles.subtitleText}>Jadwal Mengemudi Anda</Text>
        </View>

        {loading ? (
          <View style={styles.centerCenter}>
            <ActivityIndicator size="large" color="#0B5ED7" />
            <Text style={{ marginTop: 10, color: "#64748B" }}>
              Memuat jadwal...
            </Text>
          </View>
        ) : (
          <>
            {jadwalAktif.length === 0 ? (
              <View style={styles.emptyCard}>
                <FontAwesome
                  name="calendar-check-o"
                  size={36}
                  color="#CBD5E1"
                  style={{ marginBottom: 10 }}
                />
                <Text style={styles.emptyText}>
                  Belum ada jadwal penugasan mengemudi untuk Anda saat ini.
                </Text>
              </View>
            ) : (
              jadwalAktif.map((item: any) => (
                <View key={item.id_peminjaman} style={styles.card}>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>Jadwal Mendatang</Text>
                  </View>

                  <Text style={styles.tujuanText}>📍 {item.tujuan}</Text>
                  <Text style={styles.waktuText}>
                    {item.tanggal} | Pukul {item.jam}
                  </Text>
                  <Text style={styles.armadaText}>
                    Armada: {item.jenis_kendaraan} ({item.no_polisi})
                  </Text>

                  <View style={styles.divider} />

                  <Text style={styles.peminjamText}>
                    Peminjam: {item.nama_peminjam} ({item.jumlah_penumpang}{" "}
                    Penumpang)
                  </Text>
                  <Text style={styles.agendaText}>
                    Agenda: "{item.keperluan}"
                  </Text>

                  <TouchableOpacity
                    style={styles.btnWA}
                    onPress={() =>
                      handleHubungiWA(item.nama_peminjam, item.no_hp)
                    }
                  >
                    <FontAwesome name="whatsapp" size={16} color="#FFF" />
                    <Text style={styles.btnWAText}>
                      Hubungi Peminjam (WhatsApp)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnMulai}
                    onPress={() => mulaiPerjalanan(item.id_peminjaman)}
                  >
                    <FontAwesome name="play" size={14} color="#FFF" />
                    <Text style={styles.btnMulaiText}>
                      Mulai Perjalanan & Aktifkan GPS
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnSelesai}
                    onPress={() =>
                      handleSelesai(item.id_peminjaman, item.id_kendaraan)
                    }
                  >
                    <FontAwesome name="flag-checkered" size={14} color="#FFF" />
                    <Text style={styles.btnSelesaiText}>
                      Selesaikan Perjalanan
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Text style={styles.riwayatTitle}>Riwayat Perjalanan Selesai</Text>

            {riwayatList.length === 0 ? (
              <Text style={styles.emptyRiwayatText}>
                Belum ada riwayat perjalanan.
              </Text>
            ) : (
              riwayatList.map((item: any) => (
                <View key={item.id_peminjaman} style={styles.riwayatCard}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={styles.riwayatTujuan}>📍 {item.tujuan}</Text>
                    <View style={styles.riwayatBadge}>
                      <FontAwesome name="check" size={10} color="#FFF" />
                    </View>
                  </View>
                  <Text style={styles.riwayatTgl}>
                    {item.tanggal} | Peminjam: {item.nama_peminjam}
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Keluar dari Akun (Logout)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#F4F7FB",
    zIndex: 10,
  },
  logoContainer: { flexDirection: "row", alignItems: "center" },
  headerLogoImg: {
    width: 38,
    height: 38,
    resizeMode: "contain",
    marginRight: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#072B69",
    letterSpacing: 0.5,
  },
  logoSubText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: -2,
    fontWeight: "600",
  },
  scrollContent: { padding: 20, paddingBottom: 40, paddingTop: 10 },
  greetingSection: { marginBottom: 20, marginTop: 10 },
  greetingText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#072B69",
    textTransform: "capitalize",
  },
  subtitleText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  centerCenter: { paddingVertical: 40, alignItems: "center" },
  emptyCard: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginBottom: 20,
  },
  emptyText: { color: "#64748B", textAlign: "center", fontSize: 13 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  cardBadge: {
    backgroundColor: "#EFF6FF",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardBadgeText: { color: "#0B5ED7", fontSize: 11, fontWeight: "bold" },
  tujuanText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 6,
  },
  waktuText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#D97706",
    marginBottom: 2,
  },
  armadaText: { fontSize: 12, color: "#64748B" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  peminjamText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 2,
  },
  agendaText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    marginBottom: 15,
  },
  btnWA: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  btnWAText: { color: "#FFF", fontWeight: "bold", fontSize: 13, marginLeft: 8 },
  btnMulai: {
    backgroundColor: "#0B5ED7",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  btnMulaiText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 8,
  },
  btnSelesai: {
    backgroundColor: "#1E293B",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnSelesaiText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 8,
  },
  riwayatTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#072B69",
    marginTop: 10,
    marginBottom: 12,
  },
  emptyRiwayatText: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
    marginLeft: 5,
  },
  riwayatCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
    elevation: 1,
  },
  riwayatTujuan: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  riwayatBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  riwayatTgl: { fontSize: 12, color: "#64748B" },
  logoutBtn: {
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    marginTop: 30,
  },
  logoutBtnText: { color: "#DC2626", fontWeight: "bold", fontSize: 14 },
});
