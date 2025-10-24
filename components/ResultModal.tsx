import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import Button from './Button';

interface ResultModalProps {
  visible: boolean;
  result: 'win' | 'lose' | 'draw' | null;
  onClose: () => void;
  rematchStatus: 'idle' | 'requested' | 'waiting' | 'declined';
  opponentName: string;
  onRematch: () => void;
  onAcceptRematch: () => void;
  onDeclineRematch?: () => void;
  rematchTimeLeft: number;
}

const ResultModal: React.FC<ResultModalProps> = ({
  visible,
  result,
  onClose,
  rematchStatus,
  opponentName,
  onRematch,
  onAcceptRematch,
  onDeclineRematch,
  rematchTimeLeft,
}) => {
  const getResultText = () => {
    if (result === 'win') return 'You Win! 🎉';
    if (result === 'lose') return 'You Lose 😔';
    if (result === 'draw') return "It's a Draw! 🤝";
    return '';
  };

  const getResultColor = () => {
    if (result === 'win') return '#00aa00';
    if (result === 'lose') return '#ff4444';
    return '#888';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={[styles.resultText, { color: getResultColor() }]}>
            {getResultText()}
          </Text>

          {/* Rematch Status Display */}
          {rematchStatus === 'waiting' && (
            <View style={styles.rematchStatusContainer}>
              <Text style={styles.rematchStatusText}>
                Waiting for {opponentName} to accept...
              </Text>
              <Text style={styles.timerText}>
                Time left: {rematchTimeLeft}s
              </Text>
            </View>
          )}

          {rematchStatus === 'requested' && (
            <View style={styles.rematchStatusContainer}>
              <Text style={styles.rematchStatusText}>
                {opponentName} wants a rematch!
              </Text>
              <Text style={styles.timerText}>
                Time left: {rematchTimeLeft}s
              </Text>
              <View style={styles.buttonRow}>
                <Button
                  title="Accept"
                  onPress={onAcceptRematch}
                  style={[styles.button, styles.acceptButton]}
                  textStyle={styles.buttonText}
                />
                <Button
                  title="Decline"
                  onPress={onDeclineRematch || (() => {})}
                  style={[styles.button, styles.declineButton]}
                  textStyle={styles.buttonText}
                />
              </View>
            </View>
          )}

          {rematchStatus === 'declined' && (
            <View style={styles.rematchStatusContainer}>
              <Text style={styles.rematchStatusText}>
                {opponentName} is not interested in a rematch
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {rematchStatus === 'idle' && (
              <Button
                title="Rematch"
                onPress={onRematch}
                style={[styles.button, styles.rematchButton]}
                textStyle={styles.buttonText}
              />
            )}
            <Button
              title="Back to Lobby"
              onPress={onClose}
              style={[styles.button, styles.lobbyButton]}
              textStyle={styles.buttonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  rematchStatusContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  rematchStatusText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  timerText: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#00aa00',
  },
  declineButton: {
    backgroundColor: '#ff4444',
  },
  rematchButton: {
    backgroundColor: '#4CAF50',
  },
  lobbyButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResultModal;