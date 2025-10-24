// screens/ChallengeStatusScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

interface Challenge {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  challengeType?: 'single' | 'series';
  bestOf?: number;
  seriesId?: string;
  createdAt: any;
}

type ChallengeStatusRouteProp = RouteProp<RootStackParamList, 'ChallengeStatus'>;
type ChallengeStatusNavigationProp = StackNavigationProp<RootStackParamList, 'ChallengeStatus'>;

const ChallengeStatusScreen = ({ navigation }: { navigation: ChallengeStatusNavigationProp }) => {
  const { challengeId, opponent, isOutgoing, challengeType = 'single', bestOf = 1 } = useRoute<ChallengeStatusRouteProp>().params;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    const unsubscribeChallenge = firestore()
      .collection('challenges')
      .doc(challengeId)
      .onSnapshot(
        async (doc) => {
          if (doc.exists) {
            const challengeData = { id: doc.id, ...doc.data() } as Challenge;
            setChallenge(challengeData);

            if (challengeData.status === 'accepted' && !hasNavigated.current) {
              if (challengeData.challengeType === 'series' && challengeData.seriesId) {
                hasNavigated.current = true;
                navigation.replace('Series', {
                  seriesId: challengeData.seriesId,
                  opponent,
                  isOutgoing,
                });
              } else if (challengeData.challengeType === 'single') {
                hasNavigated.current = true;
                navigation.replace('Game', {
                  challengeId,
                  opponent,
                  isOutgoing,
                });
              }
            }
            setLoading(false);
          } else {
            setChallenge(null);
            Alert.alert('Error', 'Challenge not found.');
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching challenge:', error);
          Alert.alert('Error', 'Failed to load challenge.');
          setLoading(false);
        }
      );

    return () => unsubscribeChallenge();
  }, [challengeId, navigation, opponent, isOutgoing]);

  const createSeriesAndGame = async (challengeData: Challenge) => {
    if (isCreatingSeries) return;
    setIsCreatingSeries(true);

    try {
      const seriesRef = firestore().collection('series').doc();
      const bestOf = challengeData.bestOf || 3;
      const gameIds: string[] = [];

      // Create all games for the series
      for (let i = 0; i < bestOf; i++) {
        const gameRef = firestore().collection('games').doc();
        gameIds.push(gameRef.id);
        
        await gameRef.set({
          board: ['', '', '', '', '', '', '', '', ''],
          currentTurn: i % 2 === 0 ? 'X' : 'O',
          winner: null,
          players: [challengeData.fromUserId, challengeData.toUserId],
          status: i === 0 ? 'ongoing' : 'waiting',
          allowSpectators: true,
          seriesId: seriesRef.id,
          gameNumber: i + 1,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // Create the series document
      await seriesRef.set({
        id: seriesRef.id,
        players: [challengeData.fromUserId, challengeData.toUserId],
        playerNames: [challengeData.fromUserName, challengeData.toUserName],
        bestOf,
        games: gameIds,
        scores: {
          [challengeData.fromUserId]: 0,
          [challengeData.toUserId]: 0,
        },
        status: 'ongoing',
        winner: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        currentGameIndex: 0,
      });

      // Update challenge with series ID
      await firestore().collection('challenges').doc(challengeId).update({
        seriesId: seriesRef.id,
        status: 'accepted',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error creating series:', error);
      Alert.alert('Error', `Failed to create series: ${error.message}`);
      setIsCreatingSeries(false);
    }
  };

  const handleResponse = async (response: 'accepted' | 'declined') => {
    if (!challenge) return;
    try {
      await firestore().collection('challenges').doc(challengeId).update({
        status: response,
        respondedAt: firestore.FieldValue.serverTimestamp(),
      });

      if (response === 'accepted') {
        if (challenge.challengeType === 'series') {
          await createSeriesAndGame(challenge);
        } else {
          // Create single game
          await firestore().collection('games').doc(challengeId).set({
            board: ['', '', '', '', '', '', '', '', ''],
            currentTurn: 'X',
            winner: null,
            players: [challenge.fromUserId, challenge.toUserId],
            status: 'ongoing',
            allowSpectators: true,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      } else {
        navigation.navigate('Lobby');
      }
    } catch (error: any) {
      console.error('Error updating challenge:', error);
      Alert.alert('Error', `Failed to update challenge: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffa500';
      case 'accepted': return '#00ff00';
      case 'declined': return '#ff4444';
      case 'expired': return '#888';
      default: return '#fff';
    }
  };

  const getStatusMessage = () => {
    if (!challenge) return '';
    const seriesInfo = challenge.challengeType === 'series' ? ` (Best of ${challenge.bestOf})` : '';
    
    switch (challenge.status) {
      case 'pending':
        return isOutgoing
          ? `Waiting for ${opponent.name} to respond...${seriesInfo}`
          : `${challenge.fromUserName} is waiting for your response${seriesInfo}`;
      case 'accepted':
        return `Challenge accepted!${seriesInfo} Starting game...`;
      case 'declined':
        return isOutgoing ? `${opponent.name} declined your challenge` : 'You declined the challenge';
      case 'expired':
        return 'Challenge has expired';
      default:
        return 'Unknown status';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#ff4444" />
        <Text style={styles.loadingText}>Loading challenge...</Text>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Challenge not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Lobby')}
        >
          <Text style={styles.backButtonText}>Go Back to Lobby</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Challenge Status</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.matchTypeBadge}>
          <Text style={styles.matchTypeText}>
            {challenge.challengeType === 'series' ? `Best of ${challenge.bestOf} Series` : 'Single Match'}
          </Text>
        </View>

        <Text style={styles.opponentText}>
          {isOutgoing ? `Challenging: ${opponent.name}` : `From: ${challenge.fromUserName}`}
        </Text>

        <Text style={styles.gameTypeText}>Game: Tic Tac Toe</Text>

        <View style={[styles.statusContainer, { borderColor: getStatusColor(challenge.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(challenge.status) }]}>
            {challenge.status.toUpperCase()}
          </Text>
          {challenge.challengeType === 'series' && challenge.bestOf && (
            <Text style={[styles.seriesInfo, { color: getStatusColor(challenge.status) }]}>
              Best of {challenge.bestOf} Series
            </Text>
          )}
        </View>

        <Text style={styles.statusMessage}>{getStatusMessage()}</Text>

        {!isOutgoing && challenge.status === 'pending' && (
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleResponse('accepted')}
              disabled={isCreatingSeries}
            >
              {isCreatingSeries ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Accept Challenge</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleResponse('declined')}
            >
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.lobbyButton}
        onPress={() => navigation.navigate('Lobby')}
      >
        <Text style={styles.lobbyButtonText}>Back to Lobby</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTypeBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  matchTypeText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
  },
  opponentText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  gameTypeText: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 30,
  },
  statusContainer: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    minWidth: '80%',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  seriesInfo: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  statusMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  acceptButton: {
    backgroundColor: '#00aa00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#cc4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lobbyButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  lobbyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChallengeStatusScreen;