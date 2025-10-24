import React, { useState, useEffect } from "react";
import { View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

const ProfileScreen = () => {
  const [userData, setUserData] = useState({ fullName: "Unknown", email: "" });
  const [loading, setLoading] = useState(true);
  const currentUserId = auth().currentUser?.uid;

  useEffect(() => {
    if (currentUserId) {
      firestore()
        .collection("users")
        .doc(currentUserId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const data = doc.data();
            setUserData({ fullName: data?.fullName || "Unknown", email: data?.email || "" });
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#121212", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#e63946" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#121212", justifyContent: "center", alignItems: "center" }}>
      <View style={{ padding: 16, backgroundColor: "#1E1E1E", borderRadius: 8, alignItems: "center" }}>
        <Text style={{ color: "#e63946", fontSize: 32, fontWeight: "bold", marginBottom: 16 }}>
          Profile
        </Text>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "500", marginBottom: 8 }}>
          {userData.fullName}
        </Text>
        <Text style={{ color: "#aaa", fontSize: 16, marginBottom: 16 }}>
          {userData.email}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: "#cc4444", padding: 10, borderRadius: 8, width: 120, alignItems: "center" }}
          onPress={handleLogout}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ProfileScreen;