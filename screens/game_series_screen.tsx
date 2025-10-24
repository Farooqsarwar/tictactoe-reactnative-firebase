import React, { useEffect, useState, useRef } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Button from '../components/Button';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: any;
  avatar?: string | null;
}

interface Series {
  id: string;
  players: string[];
  playerNames: string[];
  bestOf: number;
  games: string[];
  scores: { [key: string]: number };
  status: 'ongoing' | 'finished';
  winner: string | null;
  createdAt: any;
  updatedAt: any;
  currentGameIndex: number;
  nextGameReady: { [key: string]: boolean };
}

type RootStackParamList = {
  Series: {
    seriesId: string;
    opponent: User;
    isOutgoing: boolean;
    bestOf: number;
  };
  Game: {
    challengeId: string;
    opponent: User;
    isOutgoing: boolean;
    seriesId?: string;
    gameNumber?: number;
  };
  Lobby: undefined;
};

type SeriesRouteProp = RouteProp<RootStackParamList, 'Series'>;
type SeriesNavigationProp = StackNavigationProp<RootStackParamList, 'Series'>;

const SeriesScreen = ({ navigation }: { navigation: SeriesNavigationProp }) => {
  const route = useRoute<SeriesRouteProp>();
  const { seriesId, opponent, isOutgoing, bestOf } = route.params || {};
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = auth().currentUser;
  const navigationInProgressRef = useRef(false);

  // Safe access to user properties
  const currentUserId = currentUser?.uid || '';
  const playerName = currentUser?.displayName || 'You';
  const opponentId = opponent?.id || '';
  const opponentName = opponent?.name || 'Opponent';

  const createNewGameForSeries = async (seriesData: Series): Promise<string> => {
    try {
      console.log('Creating new game for series, current index:', seriesData.currentGameIndex);
      
      // Create new game for the series
      const newGameRef = firestore().collection('games').doc();
      await newGameRef.set({
        board: ['', '', '', '', '', '', '', '', ''],
        currentTurn: 'X',
        winner: null,
        players: [currentUserId, opponentId],
        status: 'ongoing',
        allowSpectators: true,
        seriesId: seriesId,
        gameNumber: seriesData.currentGameIndex + 1,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Add the new game to the series
      const updatedGames = [...(seriesData.games || []), newGameRef.id];
      await firestore()
        .collection('series')
        .doc(seriesId)
        .update({
          games: updatedGames,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      console.log('New game created:', newGameRef.id);
      return newGameRef.id;
    } catch (error) {
      console.error('Error creating new game for series:', error);
      throw error;
    }
  };

  const navigateToGame = async (seriesData: Series) => {
    if (navigationInProgressRef.current) return;
    
    navigationInProgressRef.current = true;
    console.log('Navigating to game, current index:', seriesData.currentGameIndex);
    
    try {
      let gameIdToUse: string;
      
      // Check if we need to create a new game or use existing one
      if (!seriesData.games || seriesData.currentGameIndex >= seriesData.games.length) {
        console.log('Creating new game for index:', seriesData.currentGameIndex);
        gameIdToUse = await createNewGameForSeries(seriesData);
      } else {
        gameIdToUse = seriesData.games[seriesData.currentGameIndex];
        console.log('Using existing game:', gameIdToUse);
      }

      if (gameIdToUse) {
        // Determine who starts based on game number (alternating turns)
        const gameStarter = seriesData.currentGameIndex % 2 === 0 ? isOutgoing : !isOutgoing;
        
        // Navigate to the game
        navigation.navigate('Game', {
          challengeId: gameIdToUse,
          opponent,
          isOutgoing: gameStarter,
          seriesId,
          gameNumber: seriesData.currentGameIndex + 1,
        });
        console.log('Navigation to game completed');
      } else {
        console.error('No game ID available for navigation');
        navigationInProgressRef.current = false;
        Alert.alert('Error', 'Failed to start next game. Please try again.');
      }
    } catch (error) {
      console.error('Error preparing game for navigation:', error);
      navigationInProgressRef.current = false;
      Alert.alert('Error', 'Failed to start next game. Please try again.');
    }
  };

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Authentication Required', 'Please sign in to view the series.');
      navigation.navigate('Lobby');
      return;
    }

    if (!seriesId) {
      Alert.alert('Error', 'Invalid series ID.');
      navigation.navigate('Lobby');
      return;
    }

    const unsubscribeSeries = firestore()
      .collection('series')
      .doc(seriesId)
      .onSnapshot(
        async (doc) => {
          if (doc.exists) {
            const seriesData = { id: doc.id, ...doc.data() } as Series;
            console.log('Series updated - status:', seriesData.status, 
                       'currentIndex:', seriesData.currentGameIndex,
                       'userReady:', seriesData.nextGameReady?.[currentUserId],
                       'opponentReady:', seriesData.nextGameReady?.[opponentId]);
            
            setSeries(seriesData);
            setLoading(false);

            // Ensure nextGameReady is initialized with safe defaults
            if (!seriesData.nextGameReady) {
              console.log('Initializing nextGameReady for series');
              await firestore()
                .collection('series')
                .doc(seriesId)
                .update({
                  nextGameReady: { [currentUserId]: false, [opponentId]: false },
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });
              return;
            }

            // Safe access to nextGameReady properties
            const userReady = seriesData.nextGameReady?.[currentUserId] || false;
            const opponentReady = seriesData.nextGameReady?.[opponentId] || false;

            // Check if both players are ready for the next game and series is ongoing
            if (seriesData.status === 'ongoing' && userReady && opponentReady) {
              console.log('Both players ready, attempting to navigate to game');
              await navigateToGame(seriesData);
              // Reset ready status after navigation
              await firestore()
                .collection('series')
                .doc(seriesId)
                .update({
                  nextGameReady: { [currentUserId]: false, [opponentId]: false },
                  currentGameIndex: seriesData.currentGameIndex + 1,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });
            }
          } else {
            // Create series document if it doesn't exist
            setLoading(true);
            try {
              console.log('Creating new series document');
              await firestore()
                .collection('series')
                .doc(seriesId)
                .set({
                  players: [currentUserId, opponentId],
                  playerNames: [playerName, opponentName],
                  bestOf: bestOf || 3,
                  games: [],
                  scores: { [currentUserId]: 0, [opponentId]: 0 },
                  status: 'ongoing',
                  winner: null,
                  createdAt: firestore.FieldValue.serverTimestamp(),
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                  currentGameIndex: 0,
                  nextGameReady: { [currentUserId]: false, [opponentId]: false },
                });
              console.log('Series document created successfully');
            } catch (error) {
              console.error('Error creating series document:', error);
              Alert.alert('Error', 'Failed to create series. Please try again.');
            }
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error fetching series:', error);
          Alert.alert('Error', 'Failed to load series. Please try again.');
          setLoading(false);
        }
      );

    return () => {
      unsubscribeSeries();
      navigationInProgressRef.current = false;
    };
  }, [seriesId, opponent, isOutgoing, navigation, currentUser, bestOf]);

  const handleReadyForNextGame = async () => {
    if (!currentUser || !series || !seriesId) return;

    try {
      console.log('Marking ready for next game');
      await firestore()
        .collection('series')
        .doc(seriesId)
        .update({
          [`nextGameReady.${currentUserId}`]: true,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error marking ready for next game:', error);
      Alert.alert('Error', 'Failed to mark ready for next game.');
    }
  };

  const handleResetReady = async () => {
    if (!currentUser || !series || !seriesId) return;

    try {
      console.log('Resetting ready status');
      await firestore()
        .collection('series')
        .doc(seriesId)
        .update({
          [`nextGameReady.${currentUserId}`]: false,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error resetting ready status:', error);
    }
  };

  const handleBackToLobby = () => {
    navigationInProgressRef.current = false;
    navigation.navigate('Lobby');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ff4444" />
        <Text style={{ color: '#fff', fontSize: 16, marginTop: 16 }}>Loading series...</Text>
      </SafeAreaView>
    );
  }

  if (!series) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
        <Text style={{ color: '#ff4444', fontSize: 18, textAlign: 'center', marginTop: 50 }}>Series not found</Text>
        <Button
          title="Back to Lobby"
          onPress={handleBackToLobby}
          style={{ backgroundColor: '#333', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 }}
          textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
        />
      </SafeAreaView>
    );
  }

  const isSeriesComplete = series.status === 'finished';
  const isMyTurnToStart = series.currentGameIndex % 2 === 0 ? isOutgoing : !isOutgoing;
  const isReady = series.nextGameReady?.[currentUserId] || false;
  const opponentReady = series.nextGameReady?.[opponentId] || false;
  const bothReady = isReady && opponentReady;
  const requiredWins = Math.ceil(series.bestOf / 2);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#1a1a1a', marginTop: 40 }}>
          <TouchableOpacity onPress={handleBackToLobby} style={{ padding: 5 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#ff4444', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
            Series: Best of {series.bestOf}
          </Text>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#1a1a1a', padding: 16, borderRadius: 8, marginBottom: 20, width: '100%' }}>
            <Text style={{ color: '#ff4444', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
              Series Progress
            </Text>
            <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
              {playerName}: {series.scores?.[currentUserId] || 0} | {opponentName}: {series.scores?.[opponentId] || 0}
            </Text>
            <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              Game {series.currentGameIndex + 1} of {series.bestOf}
            </Text>
            <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              First to {requiredWins} wins
            </Text>
          </View>

          {!isSeriesComplete && (
            <View style={{ backgroundColor: '#333', padding: 20, borderRadius: 12, alignItems: 'center', width: '80%' }}>
              <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
                {bothReady 
                  ? 'Starting next game...' 
                  : isReady
                  ? `Waiting for ${opponentName} to be ready...`
                  : `Ready for Game ${series.currentGameIndex + 1}?`}
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
                <Text style={{ color: isReady ? '#00aa00' : '#ff4444', fontSize: 14 }}>
                  {playerName}: {isReady ? 'Ready' : 'Not Ready'}
                </Text>
                <Text style={{ color: opponentReady ? '#00aa00' : '#ff4444', fontSize: 14 }}>
                  {opponentName}: {opponentReady ? 'Ready' : 'Not Ready'}
                </Text>
              </View>
              
              {!isReady ? (
                <Button
                  title={isMyTurnToStart ? 'Start Next Game' : 'Ready for Next Game'}
                  onPress={handleReadyForNextGame}
                  style={{ backgroundColor: '#00aa00', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 10, width: '100%' }}
                  textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                />
              ) : (
                <Button
                  title="Cancel Ready"
                  onPress={handleResetReady}
                  style={{ backgroundColor: '#ff4444', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 10, width: '100%' }}
                  textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                />
              )}
              
              {bothReady && (
                <ActivityIndicator size="small" color="#00aa00" style={{ marginTop: 10 }} />
              )}
            </View>
          )}

          {isSeriesComplete && (
            <View style={{ backgroundColor: '#333', padding: 20, borderRadius: 12, alignItems: 'center', width: '80%' }}>
              <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                Series Complete!
              </Text>
              <Text style={{ color: '#fff', fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
                Winner: {series.winner === currentUserId ? playerName : opponentName}
              </Text>
              <Button
                title="Back to Lobby"
                onPress={handleBackToLobby}
                style={{ backgroundColor: '#00aa00', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '100%' }}
                textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default SeriesScreen;