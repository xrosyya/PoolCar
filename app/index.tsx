import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem("userSession");

        // Jeda minimal 2 detik biar animasinya tetap kelihatan
        setTimeout(() => {
          if (storedSession) {
            const userData = JSON.parse(storedSession);

            // Redirect sesuai ROLE
            if (userData.role === "admin") {
              // Mengambil nama dinamis dari userData, bukan di-hardcode lagi
              router.replace(`/(admin)?nama=${userData.nama || "Admin"}`);
            } else if (userData.role === "driver") {
              router.replace({
                pathname: "/(driver)",
                params: { nama_driver: userData.nama_driver },
              });
            } else {
              // Redirect Pegawai
              router.replace({ pathname: "/(tabs)", params: userData });
            }
          } else {
            // Kalau belum login, lempar ke halaman login
            router.replace("/auth");
          }
        }, 2000);
      } catch (error) {
        console.error("Gagal baca session:", error);
        router.replace("/auth");
      }
    };

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.logoContainer}>
        {/* Pastikan nama file gambar logo di bawah ini sesuai dengan logo PoolCar yang baru kamu buat */}
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logoImg}
        />
        <Text style={styles.logoText}>
          POOL<Text style={{ color: "#0B5ED7" }}>CAR</Text>
        </Text>
        <Text style={styles.logoSubText}>Sistem Peminjaman Kendaraan</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: { alignItems: "center" },
  logoImg: { width: 130, height: 130, resizeMode: "contain", marginBottom: 15 },
  logoText: {
    fontSize: 40,
    fontWeight: "900",
    color: "#072B69",
    letterSpacing: 2,
  },
  logoSubText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 8,
    letterSpacing: 0.5,
  },
});
