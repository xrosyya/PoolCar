import { FontAwesome } from "@expo/vector-icons";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LogoutSuccessScreen() {
  const router = useRouter();
  const params = useGlobalSearchParams();

  // Mengambil nama panggilan dari parameter, atau gunakan default
  const namaLengkap = params.nama ? String(params.nama) : "Pegawai";
  // Mengambil kata pertama saja untuk sapaan
  const namaPanggilan = namaLengkap.split(" ")[0];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Konten Utama di Tengah */}
      <View style={styles.content}>
        {/* Lingkaran Centang Hijau */}
        <View style={styles.iconWrapper}>
          <View
            style={[
              styles.confetti,
              { top: -20, left: 20, backgroundColor: "#EF4444" },
            ]}
          />
          <View
            style={[
              styles.confetti,
              { top: 10, left: -20, backgroundColor: "#F59E0B" },
            ]}
          />
          <View
            style={[
              styles.confetti,
              { top: -10, right: -10, backgroundColor: "#3B82F6" },
            ]}
          />
          <View
            style={[
              styles.confetti,
              { bottom: 10, right: -20, backgroundColor: "#10B981" },
            ]}
          />

          <View style={styles.circleBackground}>
            <FontAwesome name="check" size={60} color="#FFFFFF" />
          </View>
          <View style={styles.decorativeCurve} />
        </View>

        {/* Teks Ucapan */}
        <Text style={styles.titleText}>Berhasil Keluar</Text>
        <Text style={styles.subtitleText}>
          Sampai jumpa kembali, {namaPanggilan}!
        </Text>
      </View>

      {/* Tombol di Bawah */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnMasuk}
          activeOpacity={0.8}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.btnMasukText}>Masuk Kembali</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 30,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  circleBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  decorativeCurve: {
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
  confetti: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#072B69",
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  footer: {
    paddingBottom: 40,
  },
  btnMasuk: {
    backgroundColor: "#0B5ED7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#0B5ED7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  btnMasukText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
