import React, { useEffect, useRef, useState } from 'react';
import { View, Text, SafeAreaView, Alert, TouchableOpacity, Switch, TextInput, FlatList, ScrollView } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { RouteProp, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Board from '../components/Board';
import PlayerInfo from '../components/PlayerInfo';
import ResultModal from '../components/PlayerInfo';
import Button from '../components/Button';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

interface GameState {
  board: string[];
  currentTurn: 'X' | 'O';
  winner: string | null;
  players: string[];
  status: 'ongoing' | 'finished';
  rematchRequestedBy?: string;
  rematchDeclinedBy?: string;
  rematchGameId?: string;
  allowSpectators?: boolean;
  seriesId?: string;
  gameNumber?: number;
  spectators?: string[];
}

interface Series {
  id: string;
  players: string[];
  playerNames: string[];
  bestOf: number;
  scores: { [key: string]: number };
  status: 'ongoing' | 'finished';
  winner: string | null;
  currentGameIndex: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: any;
}

type RootStackParamList = {
  Game: { challengeId: string; opponent: User; isOutgoing: boolean; seriesId?: string; gameNumber?: number };
  Series: { seriesId: string; opponent: User; isOutgoing: boolean };
  Lobby: undefined;
};

type GameRouteProp = RouteProp<RootStackParamList, 'Game'>;

const checkWinner = (board: string[]): 'X' | 'O' | 'draw' | null => {
  if (!board || board.length !== 9) return null;
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as 'X' | 'O';
    }
  }
  return board.every(cell => cell !== '') ? 'draw' : null;
};

const GameScreen = ({ navigation }: { navigation: StackNavigationProp<RootStackParamList> }) => {
  const { challengeId, opponent, isOutgoing, seriesId, gameNumber } = useRoute<GameRouteProp>().params || {};
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(25);
  const [showResultModal, setShowResultModal] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [rematchStatus, setRematchStatus] = useState<'idle' | 'requested' | 'waiting' | 'declined'>('idle');
  const [rematchTimeLeft, setRematchTimeLeft] = useState(30);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rematchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasNavigatedRef = useRef(false);
  const isProcessingResultRef = useRef(false);
  const currentUser = auth().currentUser;
  const playerSymbol = isOutgoing ? 'X' : 'O';
  const opponentSymbol = isOutgoing ? 'O' : 'X';
  const currentUserId = currentUser?.uid || '';
  const playerName = currentUser?.displayName || 'You';
  const opponentId = opponent?.id || '';
  const opponentName = opponent?.name || 'Opponent';

  const startTimer = () => {
    stopTimer();
    setTimeLeft(25);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRematchTimer = () => {
    stopRematchTimer();
    setRematchTimeLeft(30);
    rematchTimerRef.current = setInterval(() => {
      setRematchTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(rematchTimerRef.current!);
          handleRematchTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRematchTimer = () => {
    if (rematchTimerRef.current) clearInterval(rematchTimerRef.current);
    setRematchTimeLeft(30);
  };

  const handleRematchTimeout = async () => {
    if (!challengeId || hasNavigatedRef.current) return;
    try {
      await firestore().collection('games').doc(challengeId).update({
        rematchDeclinedBy: 'timeout',
        rematchRequestedBy: firestore.FieldValue.delete(),
        rematchRequestedAt: firestore.FieldValue.delete(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setRematchStatus('declined');
      hasNavigatedRef.current = true;
      navigation.replace('Lobby');
    } catch (error) {
      console.error('Error handling rematch timeout:', error);
    }
  };

  const handleTimeUp = async () => {
    if (!gameState || gameState.status !== 'ongoing' || gameState.currentTurn !== playerSymbol) return;
    try {
      await firestore().collection('games').doc(challengeId).update({
        currentTurn: opponentSymbol,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      stopTimer();
      setTimeLeft(25);
    } catch (error) {
      console.error('Error handling time up:', error);
    }
  };

  const handleCellPress = async (index: number) => {
    if (!gameState || gameState.status !== 'ongoing' || gameState.currentTurn !== playerSymbol || gameState.board[index] !== '') return;
    try {
      const newBoard = [...gameState.board];
      newBoard[index] = playerSymbol;
      const winner = checkWinner(newBoard);
      await firestore().collection('games').doc(challengeId).update({
        board: newBoard,
        currentTurn: opponentSymbol,
        winner,
        status: winner ? 'finished' : 'ongoing',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      stopTimer();
      setTimeLeft(25);
    } catch (error) {
      console.error('Error updating game:', error);
      Alert.alert('Error', 'Failed to make move.');
    }
  };

  const handleGameResult = async (winner: string | null) => {
    if (!gameState) return;
    setShowResultModal(true);
    setGameResult(winner === 'draw' ? 'draw' : winner === playerSymbol ? 'win' : 'lose');

    if (seriesId && series && winner && winner !== 'draw') {
      const newScores = { ...series.scores, [winner === playerSymbol ? currentUserId : opponentId]: (series.scores[winner === playerSymbol ? currentUserId : opponentId] || 0) + 1 };
      const requiredWins = Math.ceil(series.bestOf / 2);
      const seriesStatus = newScores[currentUserId] >= requiredWins ? 'finished' : newScores[opponentId] >= requiredWins ? 'finished' : 'ongoing';
      const seriesWinner = newScores[currentUserId] >= requiredWins ? currentUserId : newScores[opponentId] >= requiredWins ? opponentId : null;

      try {
        await firestore().collection('series').doc(seriesId).update({
          scores: newScores,
          status: seriesStatus,
          winner: seriesWinner,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        console.error('Error updating series:', error);
      }
    }
  };

  const handleSeriesGameComplete = () => {
    if (!seriesId || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    setShowResultModal(false);
    navigation.replace('Series', { seriesId, opponent, isOutgoing });
  };

  const handleRematch = async () => {
    if (!gameState || hasNavigatedRef.current || !challengeId) return;
    try {
      if (!gameState.rematchRequestedBy) {
        await firestore().collection('games').doc(challengeId).update({
          rematchRequestedBy: currentUserId,
          rematchRequestedAt: firestore.FieldValue.serverTimestamp(),
          rematchDeclinedBy: firestore.FieldValue.delete(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        setRematchStatus('waiting');
        startRematchTimer();
      }
    } catch (error) {
      console.error('Error requesting rematch:', error);
      Alert.alert('Error', 'Failed to request rematch.');
    }
  };

  const handleAcceptRematch = async () => {
    if (!gameState || !gameState.rematchRequestedBy || !challengeId || hasNavigatedRef.current) return;
    try {
      const newGameRef = firestore().collection('games').doc();
      await newGameRef.set({
        board: Array(9).fill(''),
        currentTurn: 'X',
        winner: null,
        players: [currentUserId, opponentId],
        status: 'ongoing',
        allowSpectators: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      await firestore().collection('games').doc(challengeId).update({
        rematchGameId: newGameRef.id,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setRematchStatus('idle');
      stopRematchTimer();
      hasNavigatedRef.current = true;
      navigation.replace('Game', { challengeId: newGameRef.id, opponent, isOutgoing });
    } catch (error) {
      console.error('Error accepting rematch:', error);
      Alert.alert('Error', 'Failed to accept rematch.');
    }
  };

  const handleDeclineRematch = async () => {
    if (!gameState || !challengeId || hasNavigatedRef.current) return;
    try {
      await firestore().collection('games').doc(challengeId).update({
        rematchDeclinedBy: currentUserId,
        rematchRequestedBy: firestore.FieldValue.delete(),
        rematchRequestedAt: firestore.FieldValue.delete(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setRematchStatus('declined');
      stopRematchTimer();
      hasNavigatedRef.current = true;
      navigation.replace('Lobby');
    } catch (error) {
      console.error('Error declining rematch:', error);
    }
  };

  const handleToggleSpectators = async () => {
    if (!challengeId) return;
    try {
      await firestore().collection('games').doc(challengeId).update({
        allowSpectators: !allowSpectators,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setAllowSpectators(!allowSpectators);
    } catch (error) {
      console.error('Error toggling spectators:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !challengeId) return;
    try {
      await firestore().collection('games').doc(challengeId).collection('chat').add({
        senderId: currentUserId,
        senderName: playerName,
        message: chatInput.trim(),
        timestamp: firestore.FieldValue.serverTimestamp(),
      });
      setChatInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (!currentUser || !challengeId) {
      Alert.alert('Error', !currentUser ? 'Please sign in to play.' : 'Invalid game challenge.');
      navigation.replace('Lobby');
      return;
    }

    const unsubscribeGame = firestore().collection('games').doc(challengeId).onSnapshot(
      async doc => {
        if (doc.exists) {
          const data = doc.data() as GameState;
          setGameState(data);
          setAllowSpectators(data.allowSpectators ?? true);

          if (data.status === 'ongoing' && !data.winner) {
            if (data.currentTurn === playerSymbol && !timerRef.current) {
              startTimer();
            } else if (data.currentTurn !== playerSymbol) {
              stopTimer();
            }
          } else {
            stopTimer();
          }

          if (data.winner && data.status === 'finished' && !isProcessingResultRef.current) {
            isProcessingResultRef.current = true;
            await handleGameResult(data.winner);
            isProcessingResultRef.current = false;
          }

          if (!seriesId && data.status === 'finished') {
            if (data.rematchDeclinedBy && !hasNavigatedRef.current) {
              setRematchStatus('declined');
              stopRematchTimer();
              hasNavigatedRef.current = true;
              navigation.replace('Lobby');
            } else if (data.rematchRequestedBy) {
              setRematchStatus(data.rematchRequestedBy === currentUserId ? 'waiting' : 'requested');
              if (data.rematchRequestedBy === currentUserId && !rematchTimerRef.current) {
                startRematchTimer();
              } else if (data.rematchRequestedBy !== currentUserId) {
                stopRematchTimer();
              }
            } else if (rematchStatus !== 'idle' && rematchStatus !== 'declined') {
              setRematchStatus('idle');
              stopRematchTimer();
            }

            if (data.rematchGameId && !hasNavigatedRef.current) {
              hasNavigatedRef.current = true;
              setShowResultModal(false);
              setGameResult(null);
              setRematchStatus('idle');
              stopTimer();
              stopRematchTimer();
              navigation.replace('Game', { challengeId: data.rematchGameId, opponent, isOutgoing });
            }
          }
        } else {
          Alert.alert('Error', 'Game not found.');
          setGameState(null);
          navigation.replace('Lobby');
        }
      },
      error => Alert.alert('Error', 'Failed to load game.')
    );

    const unsubscribeChat = firestore()
      .collection('games')
      .doc(challengeId)
      .collection('chat')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(
        snapshot => {
          const messages: ChatMessage[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          } as ChatMessage)).reverse();
          setChatMessages(messages);
        },
        error => console.error('Error fetching chat:', error)
      );

    const unsubscribeSeries = seriesId
      ? firestore()
          .collection('series')
          .doc(seriesId)
          .onSnapshot(doc => doc.exists && setSeries({ id: doc.id, ...doc.data() } as Series))
      : null;

    return () => {
      unsubscribeGame();
      unsubscribeChat();
      unsubscribeSeries?.();
      stopTimer();
      stopRematchTimer();
      hasNavigatedRef.current = false;
    };
  }, [challengeId, currentUser, seriesId]);

  if (!currentUser || !gameState) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>
          {currentUser ? 'Waiting for game to start...' : 'Please sign in to play.'}
        </Text>
      </SafeAreaView>
    );
  }

  const isValidBoard = gameState.board?.length === 9;
  const isPlayerTurn = gameState.currentTurn === playerSymbol;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000',paddingTop:45}}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#1a1a1a', marginTop: 40 }}>
          <TouchableOpacity onPress={() => navigation.replace('Lobby')} style={{ padding: 5 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#ff4444', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
            Tic Tac Toe {seriesId ? `(Game ${gameNumber} of ${series?.bestOf || ''})` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 10, backgroundColor: '#1a1a1a' }}>
          <PlayerInfo name={playerName} symbol={playerSymbol} avatarUri={currentUser.photoURL} />
          <Text style={{ color: '#fff', fontSize: 18 }}>VS</Text>
          <PlayerInfo name={opponentName} symbol={opponentSymbol} avatarUri={opponent?.avatar} />
        </View>
        {series && (
          <View style={{ backgroundColor: '#1a1a1a', padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#ff4444', fontSize: 14, fontWeight: '600' }}>Series Score</Text>
            <Text style={{ color: '#fff', fontSize: 12 }}>
              {playerName}: {series.scores?.[currentUserId] || 0} | {opponentName}: {series.scores?.[opponentId] || 0}
            </Text>
          </View>
        )}
        <View style={{ padding: 10, backgroundColor: '#4a0000', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            {gameState.winner
              ? gameState.winner === 'draw'
                ? 'Game is a Draw!'
                : `Winner: ${gameState.winner === playerSymbol ? playerName : opponentName}`
              : isPlayerTurn
              ? 'Your Turn'
              : `${opponentName}'s Turn`}
          </Text>
          {!gameState.winner && gameState.status === 'ongoing' && (
            <Text style={{ color: '#ff4444', fontSize: 16, marginTop: 5 }}>
              ⏳ {String(timeLeft).padStart(2, '0')}s {isPlayerTurn ? '(Your Turn)' : `(${opponentName}'s Turn)`}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Text style={{ color: '#fff', fontSize: 16, marginRight: 10 }}>
              Allow Spectators ({gameState.spectators?.length || 0})
            </Text>
            <Switch value={allowSpectators} onValueChange={handleToggleSpectators} disabled={gameState.status === 'finished'} />
          </View>
        </View>
        {isValidBoard ? (
          <Board
            board={gameState.board}
            onCellPress={handleCellPress}
            disabled={!!gameState.winner || !isPlayerTurn || gameState.status !== 'ongoing'}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Initializing game board...</Text>
          </View>
        )}
        {gameState.status === 'finished' && !seriesId && (
          <View style={{ backgroundColor: '#1a1a1a', padding: 10, alignItems: 'center' }}>
            {rematchStatus === 'idle' && (
              <>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 10 }}>Request a rematch?</Text>
                <Button
                  title="Request Rematch"
                  onPress={handleRematch}
                  style={{ backgroundColor: '#00aa00', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '80%' }}
                  textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                />
              </>
            )}
            {rematchStatus === 'waiting' && (
              <>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 10 }}>
                  Waiting for {opponentName} to accept rematch... ({rematchTimeLeft}s)
                </Text>
                <Button
                  title="Cancel Rematch"
                  onPress={handleDeclineRematch}
                  style={{ backgroundColor: '#ff4444', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '80%' }}
                  textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                />
              </>
            )}
            {rematchStatus === 'requested' && (
              <>
                <Text style={{ color: '#fff', fontSize: 16, marginBottom: 10 }}>
                  {opponentName} requested a rematch! Accept within {rematchTimeLeft}s
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '80%' }}>
                  <Button
                    title="Accept"
                    onPress={handleAcceptRematch}
                    style={{ backgroundColor: '#00aa00', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, flex: 1, marginRight: 5 }}
                    textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                  />
                  <Button
                    title="Decline"
                    onPress={handleDeclineRematch}
                    style={{ backgroundColor: '#ff4444', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, flex: 1, marginLeft: 5 }}
                    textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                  />
                </View>
              </>
            )}
            {rematchStatus === 'declined' && (
              <Text style={{ color: '#ff4444', fontSize: 16, marginBottom: 10 }}>
                Rematch declined or timed out.
              </Text>
            )}
            <Button
              title="Back to Lobby"
              onPress={() => navigation.replace('Lobby')}
              style={{ backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '80%', marginTop: 10 }}
              textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
            />
          </View>
        )}
        <View style={{ backgroundColor: '#1a1a1a', padding: 10, height: 150 }}>
          <FlatList
            data={chatMessages}
            renderItem={({ item }) => (
              <Text style={{ color: item.senderId === currentUserId ? '#00aa00' : '#fff', fontSize: 14 }}>
                {item.senderName}: {item.message}
              </Text>
            )}
            keyExtractor={item => item.id}
            inverted
          />
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <TextInput
              style={{ flex: 1, backgroundColor: '#333', color: '#fff', borderRadius: 8, padding: 8, marginRight: 10 }}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Type a message..."
              placeholderTextColor="#888"
            />
            <Button
              title="Send"
              onPress={sendChatMessage}
              style={{ backgroundColor: '#00aa00', padding: 10, borderRadius: 8 }}
              textStyle={{ color: '#fff', fontSize: 14 }}
            />
          </View>
        </View>
        {seriesId && showResultModal && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#1a1a1a', padding: 20, borderRadius: 12, alignItems: 'center', width: '80%' }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Game {gameNumber} Result</Text>
              <Text style={{ color: '#fff', fontSize: 16, marginBottom: 10 }}>
                {gameResult === 'draw' ? 'Game is a Draw!' : `Winner: ${gameResult === 'win' ? playerName : opponentName}`}
              </Text>
              <View style={{ backgroundColor: '#333', padding: 10, borderRadius: 8, marginBottom: 15, width: '100%' }}>
                <Text style={{ color: '#ff4444', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>Series Progress</Text>
                <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>
                  {playerName}: {series?.scores?.[currentUserId] || 0} | {opponentName}: {series?.scores?.[opponentId] || 0}
                </Text>
                <Text style={{ color: '#fff', fontSize: 10, textAlign: 'center', marginTop: 2 }}>
                  Game {gameNumber} of {series?.bestOf || 3}
                </Text>
              </View>
              {series?.status === 'finished' ? (
                <>
                  <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Series Complete!</Text>
                  <Text style={{ color: '#fff', fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
                    Winner: {series.winner === currentUserId ? playerName : opponentName}
                  </Text>
                  <Button
                    title="Back to Series Overview"
                    onPress={handleSeriesGameComplete}
                    style={{ backgroundColor: '#00aa00', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 10, width: '100%' }}
                    textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                  />
                </>
              ) : (
                <>
                  <Text style={{ color: '#fff', fontSize: 14, marginBottom: 15, textAlign: 'center' }}>
                    Ready for Game {Number(gameNumber) + 1}?
                  </Text>
                  <Button
                    title="Continue to Next Game"
                    onPress={handleSeriesGameComplete}
                    style={{ backgroundColor: '#00aa00', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 10, width: '100%' }}
                    textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
                  />
                </>
              )}
              <Button
                title="Back to Lobby"
                onPress={() => navigation.replace('Lobby')}
                style={{ backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '100%' }}
                textStyle={{ color: '#fff', fontSize: 16, fontWeight: '600' }}
              />
            </View>
          </View>
        )}
    </ScrollView>
  );
};

export default GameScreen;