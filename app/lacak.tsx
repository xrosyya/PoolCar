import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

const { width, height } = Dimensions.get("window");

export default function LacakScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const namaDriver = params.pengemudi
    ? String(params.pengemudi)
    : "Febri Nugroho";
  const platNomor = params.no_polisi ? String(params.no_polisi) : "R 1900 SM";
  const kodeMobil = params.kode ? String(params.kode) : "HPY";
  const tujuanPeminjam = params.tujuan_peminjam
    ? String(params.tujuan_peminjam)
    : "PBS";

  const [liveLocation, setLiveLocation] = useState<any>(null);
  const [destCoordinate, setDestCoordinate] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [jarak, setJarak] = useState<string>("Menghitung...");
  const [waktuTempuh, setWaktuTempuh] = useState<string>("...");
  const [estimasiTiba, setEstimasiTiba] = useState<string>("...");

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Izin akses lokasi ditolak.");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setLiveLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      try {
        const namaTujuan = tujuanPeminjam.toLowerCase();

        if (namaTujuan.includes("Bandung") || namaTujuan.includes("Jakarta")) {
          setDestCoordinate({ latitude: -7.3972661, longitude: 109.5996394 });
          return;
        }

        const query = `${tujuanPeminjam}, Jawa Tengah, Indonesia`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        );
        const data = await response.json();

        if (data && data.length > 0) {
          setDestCoordinate({
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          });
        } else {
          setDestCoordinate({ latitude: -7.385, longitude: 109.695 });
        }
      } catch (error) {
        console.log("Gagal narik API Peta:", error);
        setDestCoordinate({ latitude: -7.385, longitude: 109.695 });
      }
    })();
  }, [tujuanPeminjam]);

  useEffect(() => {
    if (liveLocation && destCoordinate) {
      const hitungRute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${liveLocation.longitude},${liveLocation.latitude};${destCoordinate.longitude},${destCoordinate.latitude}?overview=false`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const distanceMeters = data.routes[0].distance;
            const durationSeconds = data.routes[0].duration;

            const distanceKm = (distanceMeters / 1000).toFixed(1);
            setJarak(`${distanceKm} km`);

            const durationMinutes = Math.ceil(durationSeconds / 60);
            setWaktuTempuh(`${durationMinutes} menit`);

            const now = new Date();
            now.setMinutes(now.getMinutes() + durationMinutes);
            const jam = now.getHours().toString().padStart(2, "0");
            const menit = now.getMinutes().toString().padStart(2, "0");
            setEstimasiTiba(`${jam}:${menit}`);
          }
        } catch (error) {
          console.log("Gagal hitung jarak:", error);
          setJarak("Gagal");
          setWaktuTempuh("-");
          setEstimasiTiba("-");
        }
      };
      hitungRute();
    }
  }, [liveLocation, destCoordinate]);

  if (!liveLocation || !destCoordinate) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#0B5ED7" />
        <Text style={{ marginTop: 10, color: "#072B69", fontWeight: "bold" }}>
          {errorMsg ? errorMsg : "Memuat Rute Perjalanan..."}
        </Text>
      </View>
    );
  }

  const routeCoordinates = [
    liveLocation,
    {
      latitude: (liveLocation.latitude + destCoordinate.latitude) / 2 + 0.001,
      longitude:
        (liveLocation.longitude + destCoordinate.longitude) / 2 - 0.001,
    },
    destCoordinate,
  ];

  const midLat = (liveLocation.latitude + destCoordinate.latitude) / 2;
  const midLon = (liveLocation.longitude + destCoordinate.longitude) / 2;

  const latDelta =
    Math.abs(liveLocation.latitude - destCoordinate.latitude) * 1.5;
  const lonDelta =
    Math.abs(liveLocation.longitude - destCoordinate.longitude) * 1.5;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: midLat,
          longitude: midLon,
          latitudeDelta: latDelta > 0.015 ? latDelta : 0.015,
          longitudeDelta: lonDelta > 0.015 ? lonDelta : 0.015,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
      >
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#3B82F6"
          strokeWidth={4}
        />

        <Marker coordinate={liveLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.carMarkerBox}>
            <Image
              source={{ uri: "https://img.icons8.com/color/96/suv.png" }}
              style={styles.carMarkerImage}
              resizeMode="contain"
            />
          </View>
        </Marker>

        <Marker coordinate={destCoordinate}>
          <FontAwesome name="map-marker" size={40} color="#0B5ED7" />
        </Marker>
      </MapView>

      <View style={styles.topContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={18} color="#072B69" />
          </TouchableOpacity>
          <View style={styles.titleWrapper}>
            <Text style={styles.headerTitle}>Lacak Posisi Driver</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.driverCard}>
          <View style={styles.avatarBox}>
            <Image
              source={{
                uri: "https://img.icons8.com/color/96/circled-user-male-skin-type-4--v1.png",
              }}
              style={styles.avatarImage}
            />
          </View>

          {/* 👇 INI KODINGAN NAMA DRIVER YANG TADI KEPOTONG 👇 */}
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{namaDriver}</Text>
            <Text style={styles.driverPlate}>
              {kodeMobil} • {platNomor}
            </Text>

            {/* Status kita ganti jadi lebih positif */}
            <View style={styles.statusBadge}>
              <FontAwesome
                name="car"
                size={10}
                color="#059669"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.statusText}>Sedang Menjemput</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.callBtn} activeOpacity={0.7}>
            <Ionicons name="logo-whatsapp" size={20} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.etaCard}>
          <View style={styles.etaColumn}>
            <Text style={styles.etaLabel}>Tiba dalam</Text>
            <Text style={styles.etaValue}>
              {waktuTempuh} ({estimasiTiba})
            </Text>
          </View>
          <View style={styles.etaColumnRight}>
            <View>
              <Text style={styles.etaLabel}>Jarak</Text>
              <Text style={styles.etaValue}>{jarak}</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn}>
              <Feather name="refresh-cw" size={18} color="#072B69" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  map: { width: width, height: height, ...StyleSheet.absoluteFill },
  carMarkerBox: {
    backgroundColor: "#1E293B",
    padding: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFF",
    transform: [{ rotate: "-45deg" }],
  },
  carMarkerImage: { width: 25, height: 25 },
  topContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 40,
    left: 20,
    right: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: { padding: 8 },
  titleWrapper: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#072B69" },
  driverCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarBox: {
    width: 54,
    height: 54,
    backgroundColor: "#F1F5F9",
    borderRadius: 27,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 54, height: 54 },
  driverInfo: { flex: 1 },
  driverName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#072B69",
    marginBottom: 2,
  },
  driverPlate: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 10, fontWeight: "bold", color: "#059669" },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomContainer: { position: "absolute", bottom: 30, left: 20, right: 20 },
  etaCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  etaColumn: {
    flex: 1.5,
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
    justifyContent: "center",
  },
  etaColumnRight: {
    flex: 1,
    paddingLeft: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  etaLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
    fontWeight: "600",
  },
  etaValue: { fontSize: 16, fontWeight: "bold", color: "#072B69" },
  refreshBtn: { padding: 5 },
});
