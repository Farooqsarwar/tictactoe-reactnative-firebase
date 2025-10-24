// screens/LobbyScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

interface Game {
  id: string;
  players: string[];
  status: string;
  allowSpectators: boolean;
}

interface Challenge {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  challengeType?: 'single' | 'series';
  bestOf?: number;
}

type LobbyNavigationProp = StackNavigationProp<RootStackParamList, 'Lobby'>;

const LobbyScreen = ({ navigation }: { navigation: LobbyNavigationProp }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [playerNames, setPlayerNames] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    const unsubscribeCurrentUser = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const userData = doc.data();
          setCurrentUserData({
            id: doc.id,
            name: userData?.fullName || user.displayName || 'Anonymous',
            email: userData?.email || user.email || '',
            photoURL: userData?.photoURL || user.photoURL,
          });
        } else {
          // Initialize user if not exists
          firestore().collection('users').doc(user.uid).set({
            id: user.uid,
            fullName: user.displayName || 'Anonymous',
            email: user.email || '',
            photoURL: user.photoURL || '',
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      });

    const unsubscribeUsers = firestore()
      .collection('users')
      .onSnapshot((querySnapshot) => {
        const usersData: User[] = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          if (doc.id !== user.uid) {
            usersData.push({
              id: doc.id,
              name: userData.fullName || 'Unknown User',
              email: userData.email || 'No email',
              photoURL: userData.photoURL,
            });
          }
        });
        setUsers(usersData);
        setLoading(false);
      });

    const unsubscribeChallenges = firestore()
      .collection('challenges')
      .where('toUserId', '==', user.uid)
      .where('status', '==', 'pending')
      .onSnapshot((querySnapshot) => {
        const challengesData: Challenge[] = [];
        querySnapshot.forEach((doc) => {
          challengesData.push({ id: doc.id, ...doc.data() } as Challenge);
        });
        setPendingChallenges(challengesData);
      });

    const unsubscribeGames = firestore()
      .collection('games')
      .where('status', '==', 'ongoing')
      .where('allowSpectators', '==', true)
      .onSnapshot(
        async (querySnapshot) => {
          const gamesData: Game[] = [];
          const names: { [key: string]: string } = { ...playerNames };

          for (const doc of querySnapshot.docs) {
            const gameData = doc.data() as Game;
            gamesData.push({ id: doc.id, ...gameData });

            for (const playerId of gameData.players) {
              if (!names[playerId]) {
                const userDoc = await firestore().collection('users').doc(playerId).get();
                names[playerId] = userDoc.data()?.fullName || 'Unknown';
              }
            }
          }

          setPlayerNames(names);
          setLiveGames(gamesData);
        },
        (error) => {
          console.error('Error fetching live games:', error);
          Alert.alert('Error', 'Failed to load live games.');
        }
      );

    return () => {
      unsubscribeCurrentUser();
      unsubscribeUsers();
      unsubscribeChallenges();
      unsubscribeGames();
    };
  }, []);

  const sendChallenge = async (opponent: User, challengeType: 'single' | 'series', bestOf: number) => {
    if (!currentUserData) {
      Alert.alert('Error', 'Please wait while user data is loaded.');
      return;
    }

    try {
      const challengeData = {
        fromUserId: currentUserData.id,
        fromUserName: currentUserData.name,
        toUserId: opponent.id,
        toUserName: opponent.name,
        status: 'pending' as const,
        createdAt: firestore.FieldValue.serverTimestamp(),
        gameType: 'Tic Tac Toe',
        challengeType: challengeType,
        ...(challengeType === 'series' && { bestOf: bestOf }),
      };

      const docRef = await firestore().collection('challenges').add(challengeData);

      navigation.navigate('ChallengeStatus', {
        challengeId: docRef.id,
        opponent: opponent,
        isOutgoing: true,
        challengeType,
        bestOf: challengeType === 'series' ? bestOf : undefined,
      });
    } catch (error: any) {
      Alert.alert('Error', `Failed to send challenge: ${error.message}`);
    }
  };

  const handleSpectate = (game: Game) => {
    navigation.navigate('Spectator', { gameId: game.id });
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        onPress={() => Alert.alert(
          'Challenge Player',
          `Challenge ${item.name} to a game?`,
          [
            { text: 'Single Match', onPress: () => sendChallenge(item, 'single', 1) },
            { text: 'Best of 3', onPress: () => sendChallenge(item, 'series', 3) },
            { text: 'Best of 5', onPress: () => sendChallenge(item, 'series', 5) },
            { text: 'Cancel', style: 'cancel' },
          ]
        )}
        style={styles.challengeButton}
      >
        <Text style={styles.challengeButtonText}>⚔️</Text>
      </TouchableOpacity>
    </View>
  );

  const renderChallengeItem = ({ item }: { item: Challenge }) => (
    <View style={styles.challengeItem}>
      <Text style={styles.challengeText}>
        Challenge from {item.fromUserName} 
        {item.challengeType === 'series' && ` (Best of ${item.bestOf})`}
      </Text>
      <TouchableOpacity
        style={styles.viewChallengeButton}
        onPress={() => navigation.navigate('ChallengeStatus', {
          challengeId: item.id,
          opponent: {
            id: item.fromUserId,
            name: item.fromUserName,
          },
          isOutgoing: false,
          challengeType: item.challengeType,
          bestOf: item.bestOf,
        })}
      >
        <Text style={styles.viewChallengeButtonText}>View Challenge</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGameItem = ({ item }: { item: Game }) => (
    <View style={styles.gameItem}>
      <Text style={styles.gameText}>
        Live: {item.players.map(id => playerNames[id] || 'Unknown').join(' vs ')}
      </Text>
      <TouchableOpacity
        style={styles.spectateButton}
        onPress={() => handleSpectate(item)}
      >
        <Text style={styles.spectateButtonText}>Watch</Text>
      </TouchableOpacity>
    </View>
  );

  // Render horizontal lists without ScrollView
  const renderHorizontalList = (data: any[], renderItem: any, keyExtractor: any, emptyText: string) => (
    <View style={styles.horizontalListContainer}>
      {data.length > 0 ? (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#ff4444" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Game Lobby</Text>
        <Text style={styles.welcome}>
          Welcome, {currentUserData?.name || 'Player'}!
        </Text>
      </View>

      {/* Use ScrollView only for vertical scrolling, not for lists */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Games Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Matches</Text>
          {renderHorizontalList(
            liveGames,
            renderGameItem,
            (item: Game) => item.id,
            'No live matches'
          )}
        </View>

        {/* Pending Challenges Section */}
        {pendingChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Challenges</Text>
            {renderHorizontalList(
              pendingChallenges,
              renderChallengeItem,
              (item: Challenge) => item.id,
              'No pending challenges'
            )}
          </View>
        )}

        {/* Available Players Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Players</Text>
          {users.length > 0 ? (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false} // Disable scrolling since we're in ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.verticalListContent}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No other players online</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItemActive}>
          <Text style={styles.navIcon}>🏟️</Text>
          <Text style={styles.navTextActive}>Lobby</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('LeaderboardScreen')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navText}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop:45
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#ff4444',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  welcome: {
    color: '#fff',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 16,
  },
  horizontalListContainer: {
    minHeight: 120, // Ensure consistent height even when empty
  },
  horizontalListContent: {
    paddingHorizontal: 10,
  },
  verticalListContent: {
    paddingHorizontal: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#888',
    fontSize: 12,
  },
  challengeButton: {
    padding: 10,
  },
  challengeButtonText: {
    fontSize: 20,
  },
  challengeItem: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 10,
    minWidth: 200,
  },
  challengeText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  viewChallengeButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  viewChallengeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  gameItem: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 10,
    minWidth: 150,
  },
  gameText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 10,
  },
  spectateButton: {
    backgroundColor: '#00aaff',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  spectateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
  },
  navItemActive: {
    alignItems: 'center',
    padding: 10,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  navText: {
    color: '#666',
    fontSize: 12,
  },
  navTextActive: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default LobbyScreen;