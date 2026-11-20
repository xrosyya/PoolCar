import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Notifications from "expo-notifications";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
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
      Alert.alert("Gagal", "Aplikasi butuh izin untuk memunculkan notifikasi!");
      return;
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "af1503b4-2d07-4bb4-9c3c-147f3757dfb5",
      })
    ).data;
  } else {
    Alert.alert("Peringatan", "Notifikasi Push butuh perangkat HP fisik.");
  }

  return token;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("Admin");
  const [adminUsername, setAdminUsername] = useState("");

  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [tersediaCount, setTersediaCount] = useState(0);
  const [dipakaiCount, setDipakaiCount] = useState(0);
  const [bengkelCount, setBengkelCount] = useState(0);
  const [totalArmada, setTotalArmada] = useState(0);
  const [loading, setLoading] = useState(true);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRejectItem, setSelectedRejectItem] = useState<any>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const isInitialMount = useRef(true);
  const prevPendingCount = useRef(0);

  useEffect(() => {
    const fetchAdminSession = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem("userSession");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          setAdminName(session.nama || "Admin");

          const safeId = (session.username || session.nama || "admin_baru")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_");
          setAdminUsername(safeId);
        }
      } catch (e) {
        console.error("Gagal baca sesi admin:", e);
      }
    };
    fetchAdminSession();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      Alert.alert(
        "Keluar Aplikasi",
        "Apakah yakin ingin keluar dari aplikasi?",
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

  const triggerSystemNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: "default",
      },
      trigger: null,
    });
  };

  useEffect(() => {
    if (!adminUsername) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        try {
          const tokenRef = doc(db, "tb_admin_tokens", adminUsername);
          await setDoc(
            tokenRef,
            {
              expoPushToken: token,
              role: "admin",
              nama: adminName,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        } catch (err) {
          console.error("Gagal simpan token admin:", err);
        }
      }
    });

    const qPending = query(
      collection(db, "tb_peminjaman"),
      where("status", "==", "Menunggu ACC"),
    );

    const unsubscribe = onSnapshot(
      qPending,
      (snapshot) => {
        const pendingData = snapshot.docs.map((docSnap) => ({
          id_peminjaman: docSnap.id,
          ...docSnap.data(),
        }));

        pendingData.sort((a: any, b: any) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeA - timeB;
        });

        if (isInitialMount.current) {
          isInitialMount.current = false;
        } else if (pendingData.length > prevPendingCount.current) {
          triggerSystemNotification(
            "🔔 Pesanan Kendaraan Baru!",
            "Ada pengajuan peminjaman baru dari pegawai yang menunggu ACC.",
          );
        }

        prevPendingCount.current = pendingData.length;
        setPendingList(pendingData);
        setLoading(false);
      },
      (error) => {
        console.error("Error real-time listener admin:", error);
      },
    );

    return () => unsubscribe();
  }, [adminUsername, adminName]);

  const fetchKendaraanData = async () => {
    try {
      const snapKendaraan = await getDocs(collection(db, "tb_kendaraan"));
      const kendaraanData = snapKendaraan.docs.map((docSnap) => docSnap.data());

      setTotalArmada(kendaraanData.length);

      if (kendaraanData.length > 0) {
        const available = kendaraanData.filter(
          (k: any) => k.status && k.status.toLowerCase().includes("tersedia"),
        ).length;
        const used = kendaraanData.filter(
          (k: any) => k.status && k.status.toLowerCase().includes("dipakai"),
        ).length;
        const maintenance = kendaraanData.filter(
          (k: any) =>
            k.status &&
            (k.status.toLowerCase().includes("bengkel") ||
              k.status.toLowerCase().includes("servis") ||
              k.status.toLowerCase().includes("rusak") ||
              k.status.toLowerCase().includes("perbaikan")),
        ).length;

        setTersediaCount(available);
        setDipakaiCount(used);
        setBengkelCount(maintenance);
      } else {
        setTersediaCount(0);
        setDipakaiCount(0);
        setBengkelCount(0);
      }
    } catch (err) {
      console.error("Error fetch kendaraan admin:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoggedOut(false);
      fetchKendaraanData();
    }, []),
  );

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const isConfirm = window.confirm(
        "Apakah yakin ingin keluar dari Panel Admin?",
      );
      if (isConfirm) {
        AsyncStorage.removeItem("userSession").then(() => {
          setIsLoggedOut(true);
        });
      }
    } else {
      Alert.alert(
        "Konfirmasi Keluar",
        "Apakah yakin ingin keluar dari Panel Admin?",
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

  const openRejectModal = (item: any) => {
    setSelectedRejectItem(item);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      Alert.alert(
        "Perhatian",
        "Alasan penolakan wajib diisi agar pegawai mengetahui alasannya.",
      );
      return;
    }

    setIsRejecting(true);

    try {
      const peminjamanRef = doc(
        db,
        "tb_peminjaman",
        selectedRejectItem.id_peminjaman,
      );
      await updateDoc(peminjamanRef, {
        status: "Ditolak",
        alasan_tolak: rejectReason,
      });

      // FIX: Pakai .toLowerCase() agar sesuai ID dokumen token pegawai
      const namaAman = (selectedRejectItem.nama_peminjam || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_");

      const pegawaiTokenRef = doc(db, "tb_pegawai_tokens", namaAman);
      const pegawaiTokenSnap = await getDoc(pegawaiTokenRef);

      if (pegawaiTokenSnap.exists()) {
        const pushTokenPegawai = pegawaiTokenSnap.data().expoPushToken;
        if (pushTokenPegawai) {
          await sendPushNotification(
            pushTokenPegawai,
            "❌ Pengajuan Kendaraan Ditolak",
            `Maaf, pengajuan ke ${selectedRejectItem.tujuan} ditolak. Alasan: ${rejectReason}`,
            "/(tabs)",
          );
        }
      }

      setRejectModalVisible(false);
      Alert.alert(
        "Berhasil",
        "Pesanan telah ditolak dan notifikasi alasan telah dikirim ke peminjam.",
      );
    } catch (error) {
      console.error("Error tolak pesanan:", error);
      Alert.alert("Error", "Gagal menolak pesanan, coba lagi.");
    } finally {
      setIsRejecting(false);
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
            Sampai jumpa kembali, {adminName}!
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
          <Text style={styles.greetingText}>Halo, {adminName}! 👋</Text>
          <Text style={styles.greetingSub}>
            Panel Kontrol Operasional 
          </Text>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Ringkasan Operasional</Text>
          <View style={[styles.liveBadge, { borderColor: "#10B981" }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: "#3B82F6" }]}
            onPress={() =>
              router.push({
                pathname: "/(admin)/kendaraan_admin",
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
                pathname: "/(admin)/kendaraan_admin",
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
                pathname: "/(admin)/kendaraan_admin",
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
                pathname: "/(admin)/kendaraan_admin",
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

        <Text style={styles.sectionTitle}>Menu Utama Admin</Text>
        <View style={styles.actionGrid}>
          {/* FIX: Path dibikin konsisten */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push("/(admin)/kendaraan_admin")}
          >
            <View style={styles.actionIconBox}>
              <FontAwesome name="car" size={20} color="#0B5ED7" />
            </View>
            <Text style={styles.actionText}>Unit{"\n"}Kelola</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push("/(admin)/review_list")}
          >
            <View style={styles.actionIconBox}>
              <FontAwesome name="star" size={22} color="#0B5ED7" />
            </View>
            <Text style={styles.actionText}>Review{"\n"}Driver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push("/(admin)/riwayat_admin")}
          >
            <View style={styles.actionIconBox}>
              <FontAwesome name="history" size={22} color="#0B5ED7" />
            </View>
            <Text style={styles.actionText}>Riwayat{"\n"}Semua</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addAccountBtn}
          onPress={() => router.push("/(admin)/tambah_akun")}
          activeOpacity={0.8}
        >
          <View style={styles.addAccountIconBox}>
            <FontAwesome name="user-plus" size={16} color="#0B5ED7" />
          </View>
          <Text style={styles.addAccountText}>
            Tambah Akun Pegawai / Driver
          </Text>
          <FontAwesome name="chevron-right" size={12} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Permintaan Peminjaman Masuk</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingList.length}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#0B5ED7"
            style={{ marginTop: 30 }}
          />
        ) : pendingList.length === 0 ? (
          <View style={styles.emptyCard}>
            <FontAwesome
              name="check-square-o"
              size={36}
              color="#CBD5E1"
              style={{ marginBottom: 10 }}
            />
            <Text style={styles.emptyText}>
              Semua permintaan sudah di-ACC. Belum ada antrean baru.
            </Text>
          </View>
        ) : (
          pendingList.map((item: any) => (
            <View key={item.id_peminjaman} style={styles.cardList}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.peminjamText}>
                    👤 {item.nama_peminjam}
                  </Text>
                  <Text style={styles.divisiText}>
                    🏢 Unit: {item.unit_peminjam || "-"} | Divisi:{" "}
                    {item.divisi_peminjam || "-"}
                  </Text>
                </View>
                <View style={styles.badgeOrange}>
                  <Text style={styles.badgeTextOrange}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.destText}>📍 {item.tujuan}</Text>
              <Text style={styles.dateText}>
                📅 {item.tanggal} | Pukul {item.jam}
              </Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                  👥 {item.jumlah_penumpang} Penumpang
                </Text>
                <Text style={styles.infoText} numberOfLines={1}>
                  📝 "{item.keperluan}"
                </Text>
              </View>

              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={styles.accBtnBlue}
                  onPress={() =>
                    router.push({
                      pathname: "/(admin)/acc_peminjaman",
                      params: {
                        id_peminjaman: item.id_peminjaman,
                        tujuan: item.tujuan,
                        nama_peminjam: item.nama_peminjam,
                        unit_peminjam: item.unit_peminjam,
                        divisi_peminjam: item.divisi_peminjam,
                      },
                    })
                  }
                >
                  <FontAwesome name="check-circle" size={16} color="#FFF" />
                  <Text style={styles.accBtnText}>ACC</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtnRed}
                  onPress={() => openRejectModal(item)}
                >
                  <FontAwesome name="times-circle" size={16} color="#EF4444" />
                  <Text style={styles.rejectBtnText}>Tolak</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Radar Armada Aktif 🛰️</Text>
          <View
            style={[
              styles.liveBadge,
              { backgroundColor: "#FFFBEB", borderColor: "#FEF3C7" },
            ]}
          >
            <FontAwesome
              name="wrench"
              size={10}
              color="#D97706"
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.liveText, { color: "#D97706" }]}>
              MAINTENANCE
            </Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
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
            <Text style={[styles.placeholderText, { marginTop: 6 }]}>
              Integrasi tracking GPS armada sedang ditangguhkan sementara.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={rejectModalVisible}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <FontAwesome
                name="warning"
                size={24}
                color="#EF4444"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.modalTitle}>Tolak Pesanan</Text>
            </View>

            <Text style={styles.modalSub}>
              Pesan dari{" "}
              <Text style={{ fontWeight: "bold" }}>
                {selectedRejectItem?.nama_peminjam}
              </Text>{" "}
              akan dibatalkan. Silakan berikan alasan (cth: "Gabung armada
              dengan Mas Arry").
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ketik alasan penolakan di sini..."
              placeholderTextColor="#94A3B8"
              multiline={true}
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
              textAlignVertical="top"
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={isRejecting}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  isRejecting && { backgroundColor: "#FCA5A5" },
                ]}
                onPress={handleRejectSubmit}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Kirim Tolakan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 5,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 15,
    marginLeft: 4,
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
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
  addAccountBtn: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    elevation: 2,
  },
  addAccountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addAccountText: {
    flex: 1,
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "bold",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
    marginTop: 10,
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
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FFF",
    elevation: 2,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },
  placeholderText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  countBadge: {
    backgroundColor: "#0B5ED7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  emptyCard: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyText: { color: "#64748B", textAlign: "center", fontSize: 13 },
  cardList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  peminjamText: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  divisiText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    fontStyle: "italic",
  },
  badgeOrange: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  badgeTextOrange: { color: "#D97706", fontSize: 11, fontWeight: "bold" },
  destText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  dateText: { fontSize: 13, color: "#64748B", marginBottom: 12 },
  infoRow: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    gap: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoText: { fontSize: 12, color: "#475569" },
  actionBtnRow: { flexDirection: "row", gap: 10, marginTop: 5 },
  accBtnBlue: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#0B5ED7",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  accBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 13,
  },
  rejectBtnRed: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtnText: {
    color: "#EF4444",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    width: "100%",
    borderRadius: 16,
    padding: 24,
    elevation: 5,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  modalSub: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 15,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: "#1E293B",
    minHeight: 100,
    marginBottom: 20,
  },
  modalActionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelBtnText: { color: "#64748B", fontWeight: "bold", fontSize: 14 },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
  },
  modalSubmitBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
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
