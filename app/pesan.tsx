import { Feather, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { db } from "../constants/firebaseConfig";

// 👇 TAMBAHAN PRIORITY HIGH AGAR NOTIF NEMBUS WALAUPUN APK DI-CLOSE 👇
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
    priority: "high",
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
    console.error("Gagal mengirim Notifikasi:", error);
  }
}

export default function FormPemesananScreen() {
  const router = useRouter();

  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [tujuan, setTujuan] = useState("");

  const [tglMasuk, setTglMasuk] = useState(new Date());
  const [tglKeluar, setTglKeluar] = useState(new Date());
  const [waktuJam, setWaktuJam] = useState(new Date());

  const [showPickerMasuk, setShowPickerMasuk] = useState(false);
  const [showPickerKeluar, setShowPickerKeluar] = useState(false);
  const [showPickerJam, setShowPickerJam] = useState(false);

  const [penumpang, setPenumpang] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [unitPeminjam, setUnitPeminjam] = useState("");
  const [divisiPeminjam, setDivisiPeminjam] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const session = await AsyncStorage.getItem("userSession");
        if (session) {
          const userData = JSON.parse(session);
          if (userData.nama) setNama(userData.nama);
          if (userData.no_telp) setNoHp(userData.no_telp);
          if (userData.unit_kerja) setUnitPeminjam(userData.unit_kerja);
          if (userData.divisi) setDivisiPeminjam(userData.divisi);
        }
      } catch (error) {
        console.error("Gagal mengambil sesi:", error);
      }
    };
    fetchUserData();
  }, []);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleSubmit = async () => {
    if (!nama || !noHp || !tujuan) {
      Alert.alert(
        "Data Belum Lengkap",
        "Mohon pastikan semua data di langkah sebelumnya sudah terisi!",
      );
      return;
    }

    setLoading(true);

    const dataKirim = {
      nama_peminjam: nama,
      tujuan: tujuan,
      tanggal: formatDate(tglMasuk),
      tanggal_masuk: formatDate(tglMasuk),
      tanggal_keluar: formatDate(tglKeluar),
      jam: formatTime(waktuJam),
      jumlah_penumpang: Number(penumpang) || 0,
      keperluan: keperluan,
      no_hp: noHp,
      unit_peminjam: unitPeminjam,
      divisi_peminjam: divisiPeminjam,
      status: "Menunggu ACC",
      id_kendaraan: null,
      rating: null,
      ulasan: null,
      latitude_driver: null,
      longitude_driver: null,
      dest_lat: null,
      dest_lon: null,
      timestamp: new Date().toISOString(),
    };

    try {
      // SIMPAN DATA KE FIRESTORE
      const docRef = await addDoc(collection(db, "tb_peminjaman"), dataKirim);

      // Mengirim Notifikasi ke Admin (Token ID disesuaikan jadi admin_poolcar)
      const adminTokenRef = doc(db, "tb_admin_tokens", "admin_poolcar");
      const adminTokenSnap = await getDoc(adminTokenRef);

      if (adminTokenSnap.exists()) {
        const pushToken = adminTokenSnap.data().expoPushToken;
        if (pushToken) {
          await sendPushNotification(
            pushToken,
            "🔔 Pesanan Kendaraan Baru!",
            `Ada pengajuan dari ${nama} (Tujuan: ${tujuan}). Menunggu ACC.`,
            `/(admin)/acc_peminjaman?id_peminjaman=${docRef.id}&tujuan=${tujuan}`,
          );
        }
      }

      setLoading(false);
      Alert.alert(
        "Berhasil",
        "Pengajuan perjalanan berhasil dikirim ke Admin!",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      setLoading(false);
      console.error("Error: ", error);
      Alert.alert("Error", "Gagal mengirim pengajuan.");
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color="#072B69" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Form Perjalanan</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step >= 1 ? styles.stepActive : styles.stepInactive,
            ]}
          >
            <Text
              style={
                step >= 1 ? styles.stepTextActive : styles.stepTextInactive
              }
            >
              1
            </Text>
          </View>
          <Text
            style={
              step >= 1 ? styles.stepLabelActive : styles.stepLabelInactive
            }
          >
            Detail
          </Text>
        </View>
        <View
          style={[
            styles.stepLine,
            step >= 2 ? styles.lineActive : styles.lineInactive,
          ]}
        />
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step >= 2 ? styles.stepActive : styles.stepInactive,
            ]}
          >
            <Text
              style={
                step >= 2 ? styles.stepTextActive : styles.stepTextInactive
              }
            >
              2
            </Text>
          </View>
          <Text
            style={
              step >= 2 ? styles.stepLabelActive : styles.stepLabelInactive
            }
          >
            Pemesan
          </Text>
        </View>
        <View
          style={[
            styles.stepLine,
            step >= 3 ? styles.lineActive : styles.lineInactive,
          ]}
        />
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step >= 3 ? styles.stepActive : styles.stepInactive,
            ]}
          >
            <Text
              style={
                step >= 3 ? styles.stepTextActive : styles.stepTextInactive
              }
            >
              3
            </Text>
          </View>
          <Text
            style={
              step >= 3 ? styles.stepLabelActive : styles.stepLabelInactive
            }
          >
            Kapasitas
          </Text>
        </View>
        <View
          style={[
            styles.stepLine,
            step >= 4 ? styles.lineActive : styles.lineInactive,
          ]}
        />
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step >= 4 ? styles.stepActive : styles.stepInactive,
            ]}
          >
            <Text
              style={
                step >= 4 ? styles.stepTextActive : styles.stepTextInactive
              }
            >
              4
            </Text>
          </View>
          <Text
            style={
              step >= 4 ? styles.stepLabelActive : styles.stepLabelInactive
            }
          >
            Cek
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Detail Perjalanan</Text>

            <Text style={styles.label}>Tanggal Masuk & Tanggal Keluar</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.halfInputBox}
                onPress={() => setShowPickerMasuk(true)}
              >
                <Feather
                  name="calendar"
                  size={18}
                  color="#072B69"
                  style={styles.inputIcon}
                />
                <Text style={{ fontSize: 14, color: "#1E293B" }}>
                  {formatDate(tglMasuk)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.halfInputBox}
                onPress={() => setShowPickerKeluar(true)}
              >
                <Feather
                  name="calendar"
                  size={18}
                  color="#072B69"
                  style={styles.inputIcon}
                />
                <Text style={{ fontSize: 14, color: "#1E293B" }}>
                  {formatDate(tglKeluar)}
                </Text>
              </TouchableOpacity>
            </View>

            {showPickerMasuk && (
              <DateTimePicker
                value={tglMasuk}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowPickerMasuk(false);
                  if (selectedDate) setTglMasuk(selectedDate);
                }}
              />
            )}
            {showPickerKeluar && (
              <DateTimePicker
                value={tglKeluar}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowPickerKeluar(false);
                  if (selectedDate) setTglKeluar(selectedDate);
                }}
              />
            )}

            <Text style={styles.label}>Jam Keberangkatan</Text>
            <TouchableOpacity
              style={styles.timeInputBox}
              onPress={() => setShowPickerJam(true)}
            >
              <Feather
                name="clock"
                size={18}
                color="#072B69"
                style={styles.inputIcon}
              />
              <Text style={{ fontSize: 14, color: "#1E293B" }}>
                {formatTime(waktuJam)}
              </Text>
            </TouchableOpacity>

            {showPickerJam && (
              <DateTimePicker
                value={waktuJam}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedDate) => {
                  setShowPickerJam(false);
                  if (selectedDate) setWaktuJam(selectedDate);
                }}
              />
            )}

            <Text style={styles.label}>Keperluan / Agenda</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.fullInput}
                value={keperluan}
                onChangeText={setKeperluan}
                placeholder="Contoh: Kunjungan Kerja"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <Text style={styles.label}>Kota Tujuan</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.fullInput}
                value={tujuan}
                onChangeText={setTujuan}
                placeholder="Contoh: Semarang"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Data Pemesan (Otomatis)</Text>

            <Text style={styles.label}>Nama Peminjam</Text>
            <View style={[styles.inputBox, { backgroundColor: "#F1F5F9" }]}>
              <TextInput
                style={[styles.fullInput, { color: "#64748B" }]}
                value={nama}
                editable={false}
              />
            </View>

            <Text style={styles.label}>Nomor WhatsApp / HP</Text>
            <View style={[styles.inputBox, { backgroundColor: "#F1F5F9" }]}>
              <TextInput
                style={[
                  styles.fullInput,
                  {
                    color: !noHp || noHp === "-" ? "#EF4444" : "#64748B",
                    fontWeight: !noHp || noHp === "-" ? "bold" : "normal",
                  },
                ]}
                value={
                  !noHp || noHp === "-"
                    ? "⚠️ Wajib diisi di menu Akun/Profil"
                    : noHp
                }
                editable={false}
              />
            </View>

            <Text style={styles.label}>Bagian Pegawai (Bidang/Bagian)</Text>
            <View style={[styles.inputBox, { backgroundColor: "#F1F5F9" }]}>
              <TextInput
                style={[styles.fullInput, { color: "#64748B" }]}
                value={divisiPeminjam}
                editable={false}
              />
            </View>

            <Text style={styles.label}>Asal Unit Pegawai</Text>
            <View style={[styles.inputBox, { backgroundColor: "#F1F5F9" }]}>
              <TextInput
                style={[styles.fullInput, { color: "#64748B" }]}
                value={unitPeminjam}
                editable={false}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Kapasitas Penumpang</Text>
            <Text style={styles.label}>Jumlah Penumpang</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.fullInput}
                keyboardType="numeric"
                value={penumpang}
                onChangeText={setPenumpang}
                placeholder="Contoh: 3"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.sectionTitle}>Konfirmasi Data</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>👤 Pemesan: {nama || "-"}</Text>
              <Text style={styles.summaryText}>
                🏢 Divisi: {divisiPeminjam || "-"}
              </Text>
              <Text style={styles.summaryText}>📍 Tujuan: {tujuan || "-"}</Text>
              <Text style={styles.summaryText}>
                📅 Tgl Masuk: {formatDate(tglMasuk)} | Tgl Keluar:{" "}
                {formatDate(tglKeluar)}
              </Text>
              <Text style={styles.summaryText}>
                ⏰ Jam: {formatTime(waktuJam)}
              </Text>
              <Text style={styles.summaryText}>
                📝 Keperluan: {keperluan || "-"}
              </Text>
              <Text style={styles.summaryText}>
                👥 Penumpang: {penumpang || "0"} Orang
              </Text>
            </View>
            <View style={styles.infoBox}>
              <FontAwesome
                name="info-circle"
                size={16}
                color="#0B5ED7"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text style={styles.infoText}>
                Unit kendaraan akan ditentukan oleh Admin PoolCar setelah
                pengajuan ini disetujui.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < 4 ? (
          <TouchableOpacity style={styles.btnLanjut} onPress={handleNext}>
            <Text style={styles.btnLanjutText}>Lanjut</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnLanjutText}>Kirim Pengajuan</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  backBtn: { padding: 5, width: 32 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#072B69" },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stepItem: { alignItems: "center", width: 60, zIndex: 2 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepActive: { backgroundColor: "#0B5ED7" },
  stepInactive: { backgroundColor: "#E2E8F0" },
  stepTextActive: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  stepTextInactive: { color: "#94A3B8", fontWeight: "bold", fontSize: 14 },
  stepLabelActive: {
    fontSize: 11,
    color: "#0B5ED7",
    fontWeight: "bold",
    textAlign: "center",
  },
  stepLabelInactive: { fontSize: 11, color: "#94A3B8", textAlign: "center" },
  stepLine: {
    flex: 1,
    height: 2,
    marginTop: 15,
    marginHorizontal: -15,
    zIndex: 1,
  },
  lineActive: { backgroundColor: "#0B5ED7" },
  lineInactive: { backgroundColor: "#E2E8F0" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  halfInputBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "47%",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  timeInputBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },
  inputIcon: { marginRight: 10 },
  inputBox: {
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
  },
  fullInput: { flex: 1, paddingVertical: 14, fontSize: 14, color: "#1E293B" },
  summaryBox: {
    backgroundColor: "#F8FAFC",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 8,
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E8F3FF",
    padding: 15,
    borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: "#072B69", lineHeight: 18 },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
  },
  btnLanjut: {
    backgroundColor: "#0B5ED7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  btnSubmit: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  btnLanjutText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
