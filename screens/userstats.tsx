import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  email: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  streak: number;
  winRate: number;
  rank: number;
}

type SortOption = "wins" | "winRate" | "streak" | "totalGames";

const LeaderboardScreen = ({ navigation }: { navigation: any }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("wins");
  const currentUserId = auth().currentUser?.uid;

  useEffect(() => {
    // Subscribe to both userStats and users collections
    const unsubscribeStats = firestore()
      .collection("userStats")
      .onSnapshot(
        async (statsSnapshot) => {
          try {
            // Get all user IDs from stats
            const userIds = statsSnapshot.docs.map((doc) => doc.id);

            if (userIds.length === 0) {
              setLeaderboard([]);
              setLoading(false);
              return;
            }

            // Fetch user details for all users
            const userPromises = userIds.map((userId) =>
              firestore().collection("users").doc(userId).get()
            );

            const userDocs = await Promise.all(userPromises);

            // Combine stats with user data
            const entries: LeaderboardEntry[] = statsSnapshot.docs
              .map((statDoc, index) => {
                const stats = statDoc.data();
                const userDoc = userDocs[index];
                const userData = userDoc.data();

                if (!userData) return null;

                const wins = stats.wins || 0;
                const losses = stats.losses || 0;
                const draws = stats.draws || 0;
                const totalGames = stats.totalGames || 0;
                const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

                return {
                  userId: statDoc.id,
                  fullName: userData.fullName || "Unknown",
                  email: userData.email || "",
                  wins,
                  losses,
                  draws,
                  totalGames,
                  streak: stats.streak || 0,
                  winRate,
                  rank: 0, // Will be assigned after sorting
                };
              })
              .filter((entry): entry is LeaderboardEntry => entry !== null);

            // Sort and assign ranks
            sortLeaderboard(entries, sortBy);
            setLoading(false);
          } catch (error) {
            console.error("Error fetching leaderboard:", error);
            setLoading(false);
          }
        },
        (error) => {
          console.error("Error in leaderboard subscription:", error);
          setLoading(false);
        }
      );

    return () => unsubscribeStats();
  }, [sortBy]);

  const sortLeaderboard = (entries: LeaderboardEntry[], criterion: SortOption) => {
    let sorted = [...entries];

    switch (criterion) {
      case "wins":
        sorted.sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.winRate - a.winRate; // Tie-breaker
        });
        break;
      case "winRate":
        sorted.sort((a, b) => {
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return b.wins - a.wins; // Tie-breaker
        });
        break;
      case "streak":
        sorted.sort((a, b) => {
          if (b.streak !== a.streak) return b.streak - a.streak;
          return b.wins - a.wins; // Tie-breaker
        });
        break;
      case "totalGames":
        sorted.sort((a, b) => {
          if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
          return b.wins - a.wins; // Tie-breaker
        });
        break;
    }

    // Assign ranks
    sorted.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    setLeaderboard(sorted);
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  const renderSortButton = (option: SortOption, label: string) => (
    <TouchableOpacity
      onPress={() => setSortBy(option)}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: sortBy === option ? "red" : "#333",
        borderRadius: 20,
        marginRight: 8,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 14,
          fontWeight: sortBy === option ? "600" : "400",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.userId === currentUserId;

    return (
      <View
        style={{
          backgroundColor: isCurrentUser ? "#2A1A1A" : "#1E1E1E",
          padding: 16,
          marginHorizontal: 16,
          marginVertical: 6,
          borderRadius: 12,
          borderWidth: isCurrentUser ? 2 : 0,
          borderColor: isCurrentUser ? "red" : "transparent",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          {/* Rank */}
          <View
            style={{
              width: 50,
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: "bold" }}>
              {getMedalEmoji(item.rank)}
            </Text>
          </View>

          {/* User Info */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 2,
              }}
            >
              {item.fullName} {isCurrentUser && "(You)"}
            </Text>
            <Text style={{ color: "gray", fontSize: 13 }}>{item.email}</Text>
          </View>

          {/* Main Stat (based on sort) */}
          <View style={{ alignItems: "center", marginLeft: 10 }}>
            <Text style={{ color: "red", fontSize: 24, fontWeight: "bold" }}>
              {sortBy === "winRate"
                ? `${item.winRate.toFixed(1)}%`
                : sortBy === "wins"
                ? item.wins
                : sortBy === "streak"
                ? item.streak
                : item.totalGames}
            </Text>
            <Text style={{ color: "gray", fontSize: 11 }}>
              {sortBy === "winRate"
                ? "Win Rate"
                : sortBy === "wins"
                ? "Wins"
                : sortBy === "streak"
                ? "Streak"
                : "Games"}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#333",
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#4CAF50", fontSize: 16, fontWeight: "600" }}>
              {item.wins}
            </Text>
            <Text style={{ color: "gray", fontSize: 11 }}>Wins</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#F44336", fontSize: 16, fontWeight: "600" }}>
              {item.losses}
            </Text>
            <Text style={{ color: "gray", fontSize: 11 }}>Losses</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#FFC107", fontSize: 16, fontWeight: "600" }}>
              {item.draws}
            </Text>
            <Text style={{ color: "gray", fontSize: 11 }}>Draws</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#FF9800", fontSize: 16, fontWeight: "600" }}>
              {item.streak}
            </Text>
            <Text style={{ color: "gray", fontSize: 11 }}>Streak</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#121212", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="red" />
        <Text style={{ color: "white", textAlign: "center", marginTop: 10 }}>
          Loading leaderboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#121212" ,paddingTop:60}}>
      {/* Header */}
      <View
        style={{
          padding: 20,
          backgroundColor: "#1E1E1E",
          alignItems: "center",
          borderBottomWidth: 2,
          borderBottomColor: "red",
          paddingTop:60
        }}
      >
        <Text style={{ color: "red", fontSize: 28, fontWeight: "bold" }}>
          🏆 Leaderboard
        </Text>
        <Text style={{ color: "gray", fontSize: 14, marginTop: 4 }}>
          {leaderboard.length} Players Ranked
        </Text>
      </View>

      {/* Sort Options */}
      <View
        style={{
          padding: 12,
          backgroundColor: "#1A1A1A",
        }}
      >
        <Text style={{ color: "gray", fontSize: 12, marginBottom: 8, marginLeft: 4 }}>
          Sort by:
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {renderSortButton("wins", "Most Wins")}
          {renderSortButton("winRate", "Win Rate")}
          {renderSortButton("streak", "Streak")}
          {renderSortButton("totalGames", "Most Games")}
        </View>
      </View>

      {/* Leaderboard List */}
      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ paddingVertical: 10 }}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: "gray", fontSize: 16, textAlign: "center" }}>
              No players on the leaderboard yet.
            </Text>
            <Text style={{ color: "gray", fontSize: 14, textAlign: "center", marginTop: 8 }}>
              Be the first to play a game!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default LeaderboardScreen;