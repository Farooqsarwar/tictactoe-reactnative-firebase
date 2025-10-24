import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { RouteProp, useRoute } from '@react-navigation/native';
import Board from '../components/Board';
import PlayerInfo from '../components/PlayerInfo';

interface GameState {
  board: string[];
  currentTurn: 'X' | 'O';
  winner: string | null;
  players: string[];
  status: 'ongoing' | 'finished' | 'waiting';
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

type RootStackParamList = {
  Spectator: { gameId: string };
};

type SpectatorRouteProp = RouteProp<RootStackParamList, 'Spectator'>;

const SpectatorScreen = ({ navigation }) => {
  const { gameId } = useRoute<SpectatorRouteProp>().params;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<{ [key: string]: User }>({});

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('games')
      .doc(gameId)
      .onSnapshot(async (doc) => {
        if (doc.exists) {
          const data = doc.data() as GameState;
          setGameState(data);

          // Fetch player data
          const playerData: { [key: string]: User } = {};
          for (const playerId of data.players) {
            const userDoc = await firestore().collection('users').doc(playerId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              playerData[playerId] = {
                id: playerId,
                name: userData?.name || userData?.fullName || 'Unknown',
                email: userData?.email || 'No email',
                avatar: userData?.avatar || null,
              };
            }
          }
          setPlayers(playerData);
        }
      });

    return () => unsubscribe();
  }, [gameId]);

  if (!gameState) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 50 }}>
          Loading game...
        </Text>
      </SafeAreaView>
    );
  }

  const playerX = players[gameState.players[0]];
  const playerO = players[gameState.players[1]];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 10,
          backgroundColor: '#1a1a1a',
          marginTop: 40,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text
          style={{
            color: '#ff4444',
            fontSize: 20,
            fontWeight: 'bold',
            flex: 1,
            textAlign: 'center',
          }}
        >
          Spectating Tic Tac Toe
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: 10,
          backgroundColor: '#1a1a1a',
        }}
      >
        <PlayerInfo
          name={playerX?.name || 'Unknown'}
          symbol="X"
          avatarUri={playerX?.avatar ?? undefined}
        />
        <Text style={{ color: '#fff', fontSize: 18 }}>VS</Text>
        <PlayerInfo
          name={playerO?.name || 'Unknown'}
          symbol="O"
          avatarUri={playerO?.avatar ?? undefined}
        />
      </View>
      <View
        style={{
          padding: 10,
          backgroundColor: '#4a0000',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          {gameState.winner
            ? gameState.winner === 'draw'
              ? 'Game is a Draw!'
              : `Winner: ${
                  gameState.winner === 'X' ? playerX?.name || 'Unknown' : playerO?.name || 'Unknown'
                }`
            : `${gameState.currentTurn === 'X' ? playerX?.name || 'Unknown' : playerO?.name || 'Unknown'}'s Turn`}
        </Text>
      </View>
      <Board
        board={gameState.board}
        onCellPress={() => {}}
        disabled={true}
      />
    </SafeAreaView>
  );
};

export default SpectatorScreen;