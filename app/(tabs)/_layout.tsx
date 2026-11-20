import { FontAwesome } from "@expo/vector-icons"; // Library ikon bawaan Expo
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#005b9f", 
        tabBarInactiveTintColor: "#888",
        headerShown: true, // Menampilkan judul halaman di atas
      }}
    >
      {/* 1. Menu Beranda (File index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={24} name="home" color={color} />
          ),
        }}
      />

      {/* 2. Menu Kendaraan (File kendaraan.tsx) */}
      <Tabs.Screen
        name="kendaraan"
        options={{
          title: "Kendaraan",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={24} name="car" color={color} />
          ),
        }}
      />

      {/* 3. Menu Riwayat (File riwayat.tsx) */}
      <Tabs.Screen
        name="riwayat"
        options={{
          title: "Riwayat",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={24} name="history" color={color} />
          ),
        }}
      />

      {/* 4. Menu Akun (File akun.tsx) */}
      <Tabs.Screen
        name="akun"
        options={{
          title: "Akun",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={24} name="user" color={color} />
          ),
        }}
      />

      {/* 👇 JURUS SAKTI MEMBUNUH MENU HANTU EXPLORE 👇 */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
