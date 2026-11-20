import { Feather, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

// Import Firebase
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../constants/firebaseConfig";

export default function AkunScreen() {
  const router = useRouter();

  // State untuk menyimpan data profil saat ini
  const [userData, setUserData] = useState({
    nama: "Pegawai",
    nip: "-",
    unit_kerja: "-",
    no_telp: "-",
    email: "-",
    divisi: "-",
  });

  // State untuk Modal Edit (Hanya Nomor Telepon)
  const [isEditing, setIsEditing] = useState(false);
  const [editTelp, setEditTelp] = useState("");
  const [saving, setSaving] = useState(false);

  // Ambil data dari AsyncStorage
  const loadProfile = async () => {
    try {
      const session = await AsyncStorage.getItem("userSession");
      if (session) {
        const parsedData = JSON.parse(session);
        setUserData({
          nama: parsedData.nama || "Pegawai",
          nip: parsedData.nip || "-",
          unit_kerja: parsedData.unit_kerja || "-",
          no_telp: parsedData.no_telp || "-",
          email: parsedData.email || "-",
          divisi: parsedData.divisi || "-",
        });
        setEditTelp(parsedData.no_telp || "");
      }
    } catch (error) {
      console.log("Gagal memuat profil:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  // Fungsi simpan perubahan ke Firebase & AsyncStorage (HANYA NOMOR TELEPON)
  const handleSaveProfile = async () => {
    if (!editTelp.trim()) {
      Alert.alert("Gagal", "Nomor Telepon tidak boleh kosong!");
      return;
    }

    if (!userData.nip || userData.nip === "-") {
      Alert.alert("Gagal", "NIP tidak valid untuk memperbarui profil.");
      return;
    }

    setSaving(true);
    try {
      // 1. Cari dokumen pegawai di Firebase berdasarkan NIP
      const q = query(
        collection(db, "tb_pegawai"),
        where("nip", "==", userData.nip),
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userRef = doc(db, "tb_pegawai", userDoc.id);

        // 2. Update Firebase (Hanya Update Nomor HP)
        await updateDoc(userRef, {
          no_telp: editTelp,
        });

        // 3. Update AsyncStorage (Sesi Lokal)
        const newSession = {
          ...userData,
          no_telp: editTelp,
        };
        await AsyncStorage.setItem("userSession", JSON.stringify(newSession));
        setUserData(newSession);

        Alert.alert("Sukses", "Nomor telepon berhasil diperbarui!");
        setIsEditing(false);
      } else {
        Alert.alert("Gagal", "Data pegawai tidak ditemukan di database.");
      }
    } catch (error) {
      console.error("Error update profil:", error);
      Alert.alert("Error", "Gagal menyimpan data ke server.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const isConfirm = window.confirm(
        "Apakah Anda yakin ingin keluar dari akun?",
      );
      if (isConfirm) {
        AsyncStorage.removeItem("userSession").then(() =>
          router.replace("/auth"),
        );
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
              router.replace("/auth");
            },
          },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      <Tabs.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#072B69" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Akun Saya</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
              }}
              style={styles.avatar}
            />
            <View style={styles.verifiedBadge}>
              <FontAwesome name="check" size={10} color="#FFF" />
            </View>
          </View>
          <Text style={styles.profileName}>{userData.nama}</Text>
          <Text style={styles.profileEmail}>{userData.email}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Informasi Profil</Text>
          <TouchableOpacity
            onPress={() => {
              setEditTelp(userData.no_telp !== "-" ? userData.no_telp : "");
              setIsEditing(true);
            }}
          >
            <Text style={styles.editBtnText}>Edit Nomor HP</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>NIP</Text>
            <Text style={styles.infoValue}>{userData.nip}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unit Kerja</Text>
            <Text style={styles.infoValue}>{userData.unit_kerja}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bidang</Text>
            <Text style={styles.infoValue}>{userData.divisi}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>No. Telepon</Text>
            <Text style={styles.infoValue}>{userData.no_telp}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather
            name="log-out"
            size={20}
            color="#EF4444"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutText}>Keluar Akun</Text>
        </TouchableOpacity>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* MODAL EDIT PROFIL */}
      <Modal visible={isEditing} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Nomor HP</Text>
            <Text style={styles.modalDesc}>
              Pastikan nomor WhatsApp Anda aktif agar mudah dihubungi oleh
              Driver.
            </Text>

            <Text style={styles.label}>Nomor WhatsApp / HP</Text>
            <TextInput
              style={styles.input}
              value={editTelp}
              onChangeText={setEditTelp}
              keyboardType="phone-pad"
              placeholder="Contoh: 08123456789"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleSaveProfile}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnSaveText}>Simpan</Text>
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#F8FAFC",
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#072B69" },
  spacer: { width: 24 },
  bottomSpacer: { height: 40 },
  scrollContent: { paddingHorizontal: 20 },
  profileCard: {
    backgroundColor: "#E8F3FF",
    borderRadius: 20,
    paddingVertical: 25,
    alignItems: "center",
    marginBottom: 25,
  },
  avatarContainer: { position: "relative", marginBottom: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0B5ED7",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E8F3FF",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 4,
  },
  profileEmail: { fontSize: 13, color: "#64748B" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#072B69" },
  editBtnText: { fontSize: 13, color: "#0B5ED7", fontWeight: "bold" },
  infoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  infoLabel: { fontSize: 13, color: "#64748B" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  divider: { height: 1, backgroundColor: "#F1F5F9" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 10,
  },
  logoutText: { color: "#EF4444", fontSize: 16, fontWeight: "bold" },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 5,
  },
  modalDesc: { fontSize: 13, color: "#64748B", marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 15,
    backgroundColor: "#F8FAFC",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 10,
  },
  btnCancelText: { color: "#64748B", fontWeight: "bold", fontSize: 14 },
  btnSave: {
    backgroundColor: "#0B5ED7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
  },
  btnSaveText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
});
