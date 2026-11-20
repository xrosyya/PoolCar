import { Feather, FontAwesome } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useState } from "react";
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

import { db } from "../../constants/firebaseConfig";

export default function TambahAkunScreen() {
  const router = useRouter();

  // State untuk Role (Pegawai / Driver)
  const [role, setRole] = useState("pegawai");

  const [nama, setNama] = useState("");
  const [nip, setNip] = useState("");
  const [email, setEmail] = useState("");
  const [unitKerja, setUnitKerja] = useState("");
  const [divisi, setDivisi] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSimpan = async () => {
    // 1. Validasi Data Kosong sesuai Role
    if (!nama || !nip || !email) {
      Alert.alert("Data Belum Lengkap", "Nama, NIP, dan Email wajib diisi!");
      return;
    }

    if (role === "pegawai" && (!unitKerja || !divisi)) {
      Alert.alert(
        "Data Belum Lengkap",
        "Kolom Unit Kerja dan Divisi wajib diisi untuk Pegawai!",
      );
      return;
    }

    setLoading(true);
    try {
      const nipBersih = nip.trim();

      // Tentukan mau simpan ke laci mana (tb_pegawai atau tb_driver)
      const namaKoleksi = role === "pegawai" ? "tb_pegawai" : "tb_driver";
      const userRef = doc(db, namaKoleksi, nipBersih);

      // 2. Cek apakah NIP sudah terdaftar di koleksi tersebut
      const cekDoc = await getDoc(userRef);
      if (cekDoc.exists()) {
        setLoading(false);
        Alert.alert("Gagal", `NIP ini sudah terdaftar sebagai ${role}!`);
        return;
      }

      // 3. Susun data yang mau disimpan (SUDAH DIPERBAIKI)
      const dataBaru: any = {
        nama: nama.trim(), // Disimpan untuk jaga-jaga kalau dipanggil 'nama'
        nama_lengkap: nama.trim(), // Disimpan untuk jaga-jaga kalau dipanggil 'nama_lengkap'
        nip: nipBersih,
        email: email.trim().toLowerCase(),
        password: nipBersih, // <-- DITAMBAHKAN: Agar bisa dipakai untuk custom login
        role: role, // <-- DITAMBAHKAN: Untuk identifikasi hak akses
        created_at: new Date().toISOString(), // <-- DITAMBAHKAN: Timestamp pembuatan akun
      };

      // Tambahkan data spesifik jika dia Pegawai
      if (role === "pegawai") {
        dataBaru.unit_kerja = unitKerja.trim();
        dataBaru.bagian = divisi.trim();
        dataBaru.no_telp = "-";
      }

      // 4. Simpan ke Firebase
      await setDoc(userRef, dataBaru);

      setLoading(false);
      Alert.alert(
        "Sukses!",
        `Akun ${role.toUpperCase()} baru berhasil ditambahkan.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      console.error("Error nambah akun:", error);
      setLoading(false);
      Alert.alert("Error", "Gagal menyimpan data ke server.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 🚀 INI KODE BUAT MENGHILANGKAN HEADER BAWAAN EXPO (TULISAN admin/tambah_akun) 🚀 */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#072B69" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah Akun Baru</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoBox}>
          <FontAwesome
            name="info-circle"
            size={20}
            color="#0B5ED7"
            style={{ marginRight: 10, marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Informasi Login</Text>
            <Text style={styles.infoText}>
              Akun yang dibuat di sini akan menggunakan{" "}
              <Text style={{ fontWeight: "bold" }}>Email</Text> sebagai
              Username, dan <Text style={{ fontWeight: "bold" }}>NIP</Text>{" "}
              sebagai Kata Sandi bawaan.
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          {/* 👇 TOMBOL PILIH ROLE (PEGAWAI / DRIVER) 👇 */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "pegawai" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("pegawai")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleText,
                  role === "pegawai" && styles.roleTextActive,
                ]}
              >
                🏢 Pegawai
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "driver" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("driver")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleText,
                  role === "driver" && styles.roleTextActive,
                ]}
              >
                🚘 Driver
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nama Lengkap</Text>
          <TextInput
            style={styles.input}
            placeholder={`Masukkan Nama ${role === "pegawai" ? "Pegawai" : "Driver"}`}
            placeholderTextColor="#94A3B8"
            value={nama}
            onChangeText={setNama}
            autoCapitalize="words"
          />

          <Text style={styles.label}>NIP / ID (Password)</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan NIP"
            placeholderTextColor="#94A3B8"
            value={nip}
            onChangeText={setNip}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Email Aktif (Username Login)</Text>
          <TextInput
            style={styles.input}
            placeholder={`contoh: ${role === "pegawai" ? "pegawai" : "driver"}@gmail.com`}
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* 👇 KOLOM INI CUMA MUNCUL KALAU YANG DIPILIH ADALAH PEGAWAI 👇 */}
          {role === "pegawai" && (
            <>
              <Text style={styles.label}>Unit Kerja</Text>
              <TextInput
                style={styles.input}
                placeholder="contoh: Kantor Pusat"
                placeholderTextColor="#94A3B8"
                value={unitKerja}
                onChangeText={setUnitKerja}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Bidang / Bagian / Divisi</Text>
              <TextInput
                style={styles.input}
                placeholder="contoh: Engineering / Administrasi"
                placeholderTextColor="#94A3B8"
                value={divisi}
                onChangeText={setDivisi}
                autoCapitalize="words"
              />
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnSimpan, loading && { backgroundColor: "#94A3B8" }]}
          onPress={handleSimpan}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome
                name="save"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.btnSimpanText}>
                Simpan Akun {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#072B69" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  infoText: { fontSize: 13, color: "#1E3A8A", lineHeight: 20 },

  /* STYLES UNTUK TOMBOL ROLE */
  roleContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 25,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  roleBtnActive: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  roleText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748B",
  },
  roleTextActive: {
    color: "#0B5ED7",
  },

  formSection: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnSimpan: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  btnSimpanText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
