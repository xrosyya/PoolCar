import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  collection,
  doc,
  getDocs, // 👈 Ditambahkan untuk memanggil data driver
  onSnapshot,
  query,
  setDoc,
  where,
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
      console.log("Izin notifikasi tidak diberikan.");
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

export default function DashboardScreen() {
  const router = useRouter();

  const [namaPengguna, setNamaPengguna] = useState("Pegawai");
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [latestRequest, setLatestRequest] = useState<any>(null);

  const [peminjamanHistory, setPeminjamanHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [totalArmada, setTotalArmada] = useState(0);
  const [tersediaCount, setTersediaCount] = useState(0);
  const [dipakaiCount, setDipakaiCount] = useState(0);
  const [bengkelCount, setBengkelCount] = useState(0);

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

  // 👇 FUNGSI CHAT DRIVER DINAMIS DARI FIREBASE 👇
  const handleChatDriver = async (namaDriver: string) => {
    if (!namaDriver) return;

    try {
      let nomorWA = null;

      // Cari nomor HP di tabel tb_driver berdasarkan nama
      const q = query(
        collection(db, "tb_driver"),
        where("nama_driver", "==", namaDriver),
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        nomorWA = data.no_hp || data.no_telp;
      } else {
        // Coba cari dengan field "nama" (berjaga-jaga jika struktur database berbeda)
        const q2 = query(
          collection(db, "tb_driver"),
          where("nama", "==", namaDriver),
        );
        const querySnapshot2 = await getDocs(q2);
        if (!querySnapshot2.empty) {
          const data2 = querySnapshot2.docs[0].data();
          nomorWA = data2.no_hp || data2.no_telp;
        }
      }

      if (!nomorWA) {
        Alert.alert(
          "Info",
          "Nomor telepon driver belum terdaftar di sistem PoolCar.",
        );
        return;
      }

      // Format otomatis agar berawalan 62
      let formattedPhone = String(nomorWA).replace(/[^0-9]/g, "");
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "62" + formattedPhone.substring(1);
      }

      const pesan = `Halo Pak ${namaDriver}, saya ${namaPengguna} dari pegawai yang mengajukan peminjaman. Mau konfirmasi posisi penjemputan nih Pak.`;
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(pesan)}`;
      Linking.openURL(url).catch(() =>
        Alert.alert("Error", "Gagal membuka aplikasi WhatsApp."),
      );
    } catch (error) {
      console.error("Gagal ambil kontak driver:", error);
      Alert.alert("Error", "Terjadi kesalahan sistem saat menghubungi driver.");
    }
  };

  useEffect(() => {
    let unsubscribePeminjaman: any;
    let unsubscribeKendaraan: any;

    const setupDashboard = async () => {
      setLoading(true);
      const session = await AsyncStorage.getItem("userSession");
      let namaYangDicari = "";

      if (session) {
        const parsedSession = JSON.parse(session);
        namaYangDicari = parsedSession.nama || "";
        setNamaPengguna(namaYangDicari);

        registerForPushNotificationsAsync().then(async (token) => {
          if (token) {
            try {
              const namaAman = namaYangDicari.replace(/[^a-zA-Z0-9]/g, "_");
              const tokenRef = doc(db, "tb_pegawai_tokens", namaAman);
              await setDoc(
                tokenRef,
                {
                  expoPushToken: token,
                  role: "pegawai",
                  nama: namaYangDicari,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true },
              );
            } catch (err) {
              console.error("Gagal simpan token pegawai:", err);
            }
          }
        });
      }

      if (!namaYangDicari) {
        setLatestRequest(null);
        setLoading(false);
        return;
      }

      const qPeminjaman = query(
        collection(db, "tb_peminjaman"),
        where("nama_peminjam", "==", namaYangDicari),
      );

      unsubscribePeminjaman = onSnapshot(qPeminjaman, (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id_peminjaman: docSnap.id,
          ...docSnap.data(),
        }));

        setPeminjamanHistory(list);

        list.sort((a: any, b: any) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        if (list.length > 0) {
          setLatestRequest(list[0]);
        } else {
          setLatestRequest(null);
        }
      });

      unsubscribeKendaraan = onSnapshot(
        collection(db, "tb_kendaraan"),
        (snapshot) => {
          const kendaraanList = snapshot.docs.map((doc) => doc.data());
          setTotalArmada(kendaraanList.length);

          const tersedia = kendaraanList.filter(
            (k: any) => k.status && k.status.toLowerCase().includes("tersedia"),
          ).length;
          const dipakai = kendaraanList.filter(
            (k: any) => k.status && k.status.toLowerCase().includes("dipakai"),
          ).length;
          const bengkel = kendaraanList.filter(
            (k: any) =>
              k.status &&
              (k.status.toLowerCase().includes("bengkel") ||
                k.status.toLowerCase().includes("servis") ||
                k.status.toLowerCase().includes("rusak") ||
                k.status.toLowerCase().includes("perbaikan")),
          ).length;

          setTersediaCount(tersedia);
          setDipakaiCount(dipakai);
          setBengkelCount(bengkel);
          setLoading(false);
        },
      );
    };

    setupDashboard();

    return () => {
      if (unsubscribePeminjaman) unsubscribePeminjaman();
      if (unsubscribeKendaraan) unsubscribeKendaraan();
    };
  }, []);

  const handlePesanKendaraan = () => {
    const adaYgBelumDireview = peminjamanHistory.find(
      (item) => item.status === "Selesai" && !item.rating,
    );

    if (adaYgBelumDireview) {
      Alert.alert(
        "Aksi Diperlukan",
        "Anda memiliki riwayat perjalanan yang belum diberi ulasan. Silakan berikan rating kepada driver terlebih dahulu sebelum memesan kendaraan baru.",
        [
          { text: "Batal", style: "cancel" },
          { text: "Beri Ulasan", onPress: () => router.push("/riwayat") },
        ],
      );
    } else {
      router.push("/pesan");
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const isConfirm = window.confirm(
        "Apakah Anda yakin ingin keluar dari akun?",
      );
      if (isConfirm) {
        AsyncStorage.removeItem("userSession").then(() => {
          setIsLoggedOut(true);
        });
      }
    } else {
      Alert.alert(
        "Konfirmasi Keluar",
        "Apakah Anda yakin ingin keluar dari akun?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ya, Keluar",
            style: "destructive",
            onPress: async () => {
              await AsyncStorage.removeItem("userSession");
              setIsLoggedOut(true);
            },
          },
        ],
      );
    }
  };

  if (isLoggedOut) {
    return (
      <View style={styles.containerLogout}>
        <View style={styles.contentLogout}>
          <View style={styles.iconWrapperLogout}>
            <View
              style={[
                styles.confettiLogout,
                { top: -20, left: 20, backgroundColor: "#EF4444" },
              ]}
            />
            <View
              style={[
                styles.confettiLogout,
                { top: 10, left: -20, backgroundColor: "#F59E0B" },
              ]}
            />
            <View
              style={[
                styles.confettiLogout,
                { top: -10, right: -10, backgroundColor: "#3B82F6" },
              ]}
            />
            <View
              style={[
                styles.confettiLogout,
                { bottom: 10, right: -20, backgroundColor: "#10B981" },
              ]}
            />
            <View style={styles.circleBackgroundLogout}>
              <FontAwesome name="check" size={60} color="#FFFFFF" />
            </View>
            <View style={styles.decorativeCurveLogout} />
          </View>
          <Text style={styles.titleTextLogout}>Berhasil Keluar</Text>
          <Text style={styles.subtitleTextLogout}>
            Sesi Anda telah diakhiri dengan aman.
          </Text>
        </View>
        <View style={styles.footerLogout}>
          <TouchableOpacity
            style={styles.btnMasukLogout}
            activeOpacity={0.8}
            onPress={() => router.replace("/auth")}
          >
            <Text style={styles.btnMasukTextLogout}>Masuk Kembali</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs.Screen options={{ headerShown: false }} />

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

        <TouchableOpacity style={styles.logoutIconBtn} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Halo, {namaPengguna}! 👋</Text>
          <Text style={styles.greetingSub}>
            Selamat bekerja, semoga harimu produktif.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#0B5ED7"
            style={{ marginVertical: 30 }}
          />
        ) : latestRequest ? (
          <View style={styles.blueCard}>
            <Image
              source={require("../../assets/images/bg_wave.png")}
              style={styles.blueCardBg}
              resizeMode="cover"
            />
            <View style={styles.blueCardRow}>
              <View style={styles.blueCardLeft}>
                <View style={styles.whiteIconBox}>
                  <FontAwesome name="car" size={20} color="#0B5ED7" />
                </View>
                <View style={styles.blueCardTextWrap}>
                  <Text style={styles.blueCardSub}>Peminjaman Terkini</Text>
                  <Text style={styles.blueCardTitle} numberOfLines={2}>
                    {latestRequest.tujuan}
                  </Text>
                  <Text style={styles.blueCardDesc} numberOfLines={1}>
                    {latestRequest.pengemudi || "Menunggu Alokasi Driver"}
                  </Text>
                </View>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.blueCardRight}>
                <View style={styles.badgeWhite}>
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          latestRequest.status === "Disetujui"
                            ? "#059669"
                            : latestRequest.status === "Selesai"
                              ? "#475569"
                              : latestRequest.status === "Ditolak"
                                ? "#EF4444"
                                : "#D97706",
                      },
                    ]}
                  >
                    {latestRequest.status}
                  </Text>
                </View>
                <View style={{ height: 10 }} />
                <Text style={styles.blueCardSub}>Jam Berangkat</Text>
                <Text style={styles.blueCardStat}>
                  {latestRequest.jam}{" "}
                  <Text style={styles.blueCardStatUnit}>WIB</Text>
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.blueCard}>
            <Image
              source={require("../../assets/images/bg_wave.png")}
              style={styles.blueCardBg}
              resizeMode="cover"
            />
            <View style={styles.blueCardRow}>
              <View style={styles.blueCardLeft}>
                <View style={styles.whiteIconBox}>
                  <FontAwesome name="line-chart" size={20} color="#0B5ED7" />
                </View>
                <View style={styles.blueCardTextWrap}>
                  <Text style={styles.blueCardSub}>Kinerja Operasional</Text>
                  <Text style={styles.blueCardTitle} numberOfLines={2}>
                    Semua Berjalan Lancar!
                  </Text>
                  <Text style={styles.blueCardDesc} numberOfLines={2}>
                    Terus berikan pelayanan terbaik.
                  </Text>
                </View>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.blueCardRight}>
                <Text style={styles.blueCardSub}>Total Armada</Text>
                <Text style={styles.blueCardStat}>
                  {totalArmada}{" "}
                  <Text style={styles.blueCardStatUnit}>unit</Text>
                </Text>
                <View style={{ height: 10 }} />
                <Text style={styles.blueCardSub}>Tersedia</Text>
                <Text style={styles.blueCardStat}>
                  {tersediaCount}{" "}
                  <Text style={styles.blueCardStatUnit}>unit</Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Ketersediaan Armada</Text>
            <Text style={styles.sectionSubtitle}>
              Diperbarui secara Live (Real-Time)
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#3B82F6" }]}
            onPress={() =>
              router.push({
                pathname: "/kendaraan",
                params: { filter: "Semua" },
              })
            }
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.statTitle}>TOTAL ARMADA</Text>
              <Text style={styles.statValue}>{totalArmada}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: "#EFF6FF" }]}>
              <FontAwesome name="car" size={16} color="#3B82F6" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#10B981" }]}
            onPress={() =>
              router.push({
                pathname: "/kendaraan",
                params: { filter: "Tersedia" },
              })
            }
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.statTitle}>TERSEDIA (LIVE)</Text>
              <Text style={styles.statValue}>{tersediaCount}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: "#ECFDF5" }]}>
              <FontAwesome name="check-circle" size={18} color="#10B981" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#EF4444" }]}
            onPress={() =>
              router.push({
                pathname: "/kendaraan",
                params: { filter: "Dipakai" },
              })
            }
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.statTitle}>SEDANG DIPAKAI</Text>
              <Text style={styles.statValue}>{dipakaiCount}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: "#FEF2F2" }]}>
              <FontAwesome name="bolt" size={18} color="#EF4444" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}
            onPress={() =>
              router.push({
                pathname: "/kendaraan",
                params: { filter: "Bengkel" },
              })
            }
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.statTitle}>DI BENGKEL</Text>
              <Text style={styles.statValue}>{bengkelCount}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: "#FFFBEB" }]}>
              <FontAwesome name="wrench" size={16} color="#F59E0B" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.legendBox}>
          <FontAwesome
            name="info-circle"
            size={20}
            color="#3B82F6"
            style={{ marginTop: 2 }}
          />
          <Text style={styles.legendText}>
            Status{" "}
            <Text style={{ color: "#10B981", fontWeight: "bold" }}>
              Tersedia
            </Text>{" "}
            berarti mobil siap dipesan.{" "}
            <Text style={{ color: "#EF4444", fontWeight: "bold" }}>
              Dipakai
            </Text>{" "}
            berarti mobil sedang dalam perjalanan.{" "}
            <Text style={{ color: "#F59E0B", fontWeight: "bold" }}>
              Di Bengkel
            </Text>{" "}
            berarti mobil sedang perbaikan.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handlePesanKendaraan}
          >
            <View style={styles.actionIconBox}>
              <FontAwesome name="car" size={20} color="#0B5ED7" />
            </View>
            <Text style={styles.actionText}>Pesan{"\n"}Kendaraan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push("/kendaraan")}
          >
            <View style={styles.actionIconBox}>
              <FontAwesome name="check-circle-o" size={22} color="#0B5ED7" />
            </View>
            <Text style={styles.actionText}>Cek{"\n"}Ketersediaan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push("/riwayat")}
          >
            <View style={styles.actionIconBox}>
              <FontAwesome name="history" size={22} color="#0B5ED7" />
            </View>
            <Text style={styles.actionText}>Riwayat{"\n"}Perjalanan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {latestRequest && latestRequest.status !== "Selesai"
              ? "Jadwal Hari Ini"
              : "Riwayat Terbaru"}
          </Text>
          <TouchableOpacity onPress={() => router.push("/riwayat")}>
            <Text style={styles.linkText}>
              Lihat Semua <FontAwesome name="angle-right" />
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {latestRequest ? (
            <View style={styles.listItem}>
              <View style={styles.listTimeBox}>
                <Text style={styles.listTime}>{latestRequest.jam}</Text>
                <View style={styles.timelineDot} />
              </View>
              <View style={styles.listContent}>
                <View style={styles.listHeader}>
                  <Text style={styles.listDest}>{latestRequest.tujuan}</Text>
                  <Text
                    style={[
                      styles.listStatus,
                      {
                        color:
                          latestRequest.status === "Disetujui"
                            ? "#059669"
                            : latestRequest.status === "Selesai"
                              ? "#475569"
                              : latestRequest.status === "Ditolak"
                                ? "#EF4444"
                                : "#D97706",
                      },
                    ]}
                  >
                    {latestRequest.status}
                  </Text>
                </View>
                <Text style={styles.listSub}>
                  Kantor → {latestRequest.tujuan}
                </Text>
                <Text style={styles.listDriver}>
                  👤 {latestRequest.pengemudi || "Belum ada driver"}
                </Text>

                {latestRequest.status === "Ditolak" &&
                  latestRequest.alasan_tolak && (
                    <View
                      style={{
                        backgroundColor: "#FEF2F2",
                        padding: 8,
                        borderRadius: 8,
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: "#FCA5A5",
                      }}
                    >
                      <Text
                        style={{
                          color: "#EF4444",
                          fontSize: 11,
                          fontStyle: "italic",
                        }}
                      >
                        Alasan Ditolak: "{latestRequest.alasan_tolak}"
                      </Text>
                    </View>
                  )}

                {latestRequest.status === "Selesai" &&
                  !latestRequest.rating && (
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() =>
                        router.push({
                          pathname: "/review",
                          params: {
                            id_peminjaman: latestRequest.id_peminjaman,
                            nama_driver: latestRequest.pengemudi,
                          },
                        })
                      }
                    >
                      <FontAwesome
                        name="star"
                        size={12}
                        color="#0B5ED7"
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={{
                          color: "#0B5ED7",
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      >
                        Beri Ulasan
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyListText}>
              Belum ada jadwal perjalanan untuk hari ini.
            </Text>
          )}
        </View>

        {latestRequest && latestRequest.status === "Disetujui" && (
          <>
            <Text style={styles.sectionTitle}>Lacak Posisi Driver</Text>
            <View style={styles.mapWrapperCard}>
              <View style={styles.mapDriverHeader}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/4140/4140047.png",
                  }}
                  style={styles.mapDriverAvatar}
                />
                <View style={styles.mapDriverInfo}>
                  <Text style={styles.mapDriverName}>
                    {latestRequest.pengemudi}
                  </Text>
                  <Text style={styles.mapDriverPlate}>
                    {latestRequest.no_polisi || "R 1900 SM"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.mapPhoneBtn}
                  onPress={() => handleChatDriver(latestRequest.pengemudi)}
                >
                  <FontAwesome name="whatsapp" size={20} color="#10B981" />
                </TouchableOpacity>
              </View>
              <View style={styles.mapArea}>
                <View style={styles.mapPlaceholder}>
                  <FontAwesome
                    name="cogs"
                    size={40}
                    color="#CBD5E1"
                    style={{ marginBottom: 12 }}
                  />
                  <Text
                    style={[
                      styles.placeholderText,
                      { fontWeight: "bold", color: "#475569", fontSize: 15 },
                    ]}
                  >
                    Fitur Sedang Dalam Pemeliharaan
                  </Text>
                  <Text
                    style={[
                      styles.placeholderText,
                      {
                        marginTop: 6,
                        paddingHorizontal: 20,
                        textAlign: "center",
                      },
                    ]}
                  >
                    Integrasi tracking GPS armada sedang ditangguhkan sementara.
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  topHeader: {
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#F4F7FB",
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  logoutIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  greetingContainer: { marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: "bold", color: "#072B69" },
  greetingSub: { fontSize: 14, color: "#64748B", marginTop: 4 },
  blueCard: {
    backgroundColor: "#0B5ED7",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0B5ED7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 25,
    position: "relative",
  },
  blueCardBg: {
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  blueCardRow: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
    zIndex: 1,
  },
  blueCardLeft: { flex: 1.3, flexDirection: "row", alignItems: "center" },
  whiteIconBox: {
    width: 42,
    height: 42,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  blueCardTextWrap: { flex: 1 },
  blueCardSub: { fontSize: 11, color: "#E8F3FF", marginBottom: 2 },
  blueCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  blueCardDesc: { fontSize: 11, color: "#E8F3FF", lineHeight: 16 },
  verticalDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#FFFFFF",
    opacity: 0.3,
    marginHorizontal: 15,
  },
  blueCardRight: { flex: 0.9, justifyContent: "center" },
  blueCardStat: { fontSize: 22, fontWeight: "bold", color: "#FFFFFF" },
  blueCardStatUnit: { fontSize: 11, fontWeight: "normal", color: "#E8F3FF" },
  badgeWhite: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "bold" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#072B69",
    marginLeft: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderLeftWidth: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 4,
  },
  statValue: { fontSize: 24, fontWeight: "900", color: "#1E293B" },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  legendBox: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 25,
  },
  legendText: {
    fontSize: 12,
    color: "#475569",
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  linkText: { fontSize: 13, color: "#0B5ED7", fontWeight: "600" },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  actionItem: {
    backgroundColor: "#FFFFFF",
    width: "31%",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: "#1E293B",
    textAlign: "center",
    fontWeight: "600",
  },
  listContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    marginBottom: 25,
  },
  listItem: { flexDirection: "row" },
  listTimeBox: { width: 50, alignItems: "center", marginRight: 10 },
  listTime: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 5,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0B5ED7",
    marginTop: 2,
  },
  listContent: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
    paddingLeft: 15,
    paddingBottom: 10,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  listDest: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  listStatus: { fontSize: 12, fontWeight: "bold" },
  listSub: { fontSize: 13, color: "#64748B", marginBottom: 4 },
  listDriver: { fontSize: 13, color: "#94A3B8" },
  emptyListText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 13,
    marginVertical: 10,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F3FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  mapWrapperCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    marginBottom: 25,
  },
  mapDriverHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  mapDriverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F1F5F9",
    marginRight: 15,
  },
  mapDriverInfo: { flex: 1 },
  mapDriverName: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  mapDriverPlate: { fontSize: 13, color: "#64748B", marginTop: 2 },
  mapPhoneBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  mapArea: { height: 220, width: "100%" },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  placeholderText: { color: "#64748B", fontSize: 13, fontWeight: "500" },
  containerLogout: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 30,
  },
  contentLogout: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconWrapperLogout: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  circleBackgroundLogout: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    elevation: 10,
  },
  decorativeCurveLogout: {
    position: "absolute",
    bottom: -15,
    width: 110,
    height: 30,
    borderBottomWidth: 4,
    borderColor: "#10B981",
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    opacity: 0.3,
    zIndex: 1,
  },
  confettiLogout: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  titleTextLogout: {
    fontSize: 24,
    fontWeight: "900",
    color: "#072B69",
    marginBottom: 10,
  },
  subtitleTextLogout: { fontSize: 14, color: "#64748B", fontWeight: "500" },
  footerLogout: { paddingBottom: 40 },
  btnMasukLogout: {
    backgroundColor: "#0B5ED7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  btnMasukTextLogout: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
