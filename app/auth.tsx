import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../constants/firebaseConfig";

const { width } = Dimensions.get("window");

export default function LoginPage() {
  const router = useRouter();

  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setEmailInput("");
      setPassword("");
      setShowPassword(false);
    }, []),
  );

  const handleLogin = async () => {
    if (emailInput.trim() === "" || password.trim() === "") {
      Alert.alert(
        "Data Kosong",
        "Email dan Kata Sandi (NIP) tidak boleh kosong!",
      );
      return;
    }

    const inputEmail = emailInput.trim().toLowerCase();
    const inputPassword = password.trim();

    setLoading(true);

    try {
      // 1. CEK LOGIN ADMIN (Di koleksi tb_admin)
      const qAdmin = query(
        collection(db, "tb_admin"),
        where("email", "==", inputEmail),
      );
      const adminSnapshot = await getDocs(qAdmin);

      if (!adminSnapshot.empty) {
        const adminData = adminSnapshot.docs[0].data();
        if (adminData.nip !== inputPassword) {
          setLoading(false);
          Alert.alert("Gagal Masuk", "Kata Sandi (NIP) Admin salah!");
          return;
        }

        const sessionData = {
          role: "admin",
          nama: adminData.nama || "Admin",
          email: adminData.email,
          nip: adminData.nip,
        };
        await AsyncStorage.setItem("userSession", JSON.stringify(sessionData));
        setLoading(false);
        router.replace(`/(admin)?nama=${adminData.nama}`);
        return;
      }

      // 2. CEK LOGIN DRIVER (Di koleksi tb_driver)
      const qDriver = query(
        collection(db, "tb_driver"),
        where("email", "==", inputEmail),
      );
      const driverSnapshot = await getDocs(qDriver);

      if (!driverSnapshot.empty) {
        const driverData = driverSnapshot.docs[0].data();
        if (driverData.nip !== inputPassword) {
          setLoading(false);
          Alert.alert("Gagal Masuk", "Kata Sandi (NIP) Driver salah!");
          return;
        }

        const sessionData = {
          role: "driver",
          nama_driver: driverData.nama || "Driver",
          email: driverData.email,
          nip: driverData.nip,
        };
        await AsyncStorage.setItem("userSession", JSON.stringify(sessionData));
        setLoading(false);
        router.replace({
          pathname: "/(driver)",
          params: { nama_driver: driverData.nama },
        });
        return;
      }

      // 3. CEK LOGIN PEGAWAI (Di koleksi tb_pegawai)
      const qPegawai = query(
        collection(db, "tb_pegawai"),
        where("email", "==", inputEmail),
      );
      const pegawaiSnapshot = await getDocs(qPegawai);

      if (!pegawaiSnapshot.empty) {
        const pegawaiData = pegawaiSnapshot.docs[0].data();
        if (pegawaiData.nip !== inputPassword) {
          setLoading(false);
          Alert.alert("Gagal Masuk", "Kata Sandi (NIP) Pegawai salah!");
          return;
        }

        const sessionData = {
          role: "pegawai",
          nama: pegawaiData.nama_lengkap || pegawaiData.nama,
          nip: pegawaiData.nip,
          unit_kerja: pegawaiData.unit_kerja,
          no_telp: pegawaiData.no_telp,
          email: pegawaiData.email,
          divisi:
            pegawaiData.bagian ||
            pegawaiData.bidang_bagian ||
            pegawaiData.divisi ||
            "Pegawai",
        };
        await AsyncStorage.setItem("userSession", JSON.stringify(sessionData));
        setLoading(false);
        router.replace({ pathname: "/(tabs)", params: sessionData });
        return;
      }

      // JIKA TIDAK DITEMUKAN DI KETIGA ROLE TERSEBUT
      setLoading(false);
      Alert.alert("Gagal Masuk", "Email tidak ditemukan di sistem kami.");
    } catch (error) {
      setLoading(false);
      console.error("Error login: ", error);
      Alert.alert(
        "Error",
        "Gagal terhubung ke database. Periksa koneksi internet Anda.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Image
        source={require("../assets/images/bg_wave.png")}
        style={styles.bottomWave}
        resizeMode="cover"
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollGrow}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logo}
              />
              <Text style={styles.mainTitle}>POOLCAR</Text>
              <Text style={styles.subtitle}>Sistem Peminjaman Kendaraan</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Email (Username)</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan Email Anda"
                placeholderTextColor="#94A3B8"
                value={emailInput}
                onChangeText={setEmailInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Kata Sandi (NIP)</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.inputPassword}
                  placeholder="Masukkan NIP sebagai kata sandi"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <FontAwesome
                    name={showPassword ? "eye" : "eye-slash"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <FontAwesome
                    name={rememberMe ? "check-square" : "square-o"}
                    size={20}
                    color={rememberMe ? "#0B5ED7" : "#64748B"}
                  />
                  <Text style={styles.rememberText}>Ingat saya</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginText}>Masuk</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  bottomWave: {
    position: "absolute",
    bottom: 0,
    width: width,
    height: 250,
    opacity: 0.9,
  },
  scrollGrow: { flexGrow: 1, justifyContent: "center" },
  content: { paddingHorizontal: 30, paddingVertical: 40, zIndex: 1 },
  header: { alignItems: "center", marginBottom: 40 },
  logo: { width: 110, height: 110, resizeMode: "contain", marginBottom: 10 },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#072B69",
    marginBottom: 2,
    letterSpacing: 1,
  },
  subtitle: { fontSize: 14, color: "#0B5ED7", fontWeight: "600" },
  formContainer: { width: "100%" },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 20,
    color: "#1E293B",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    marginBottom: 20,
  },
  inputPassword: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 14,
    color: "#1E293B",
  },
  eyeIcon: {
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  checkboxContainer: { flexDirection: "row", alignItems: "center" },
  rememberText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#0B5ED7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#0B5ED7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  loginText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
