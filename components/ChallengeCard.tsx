import React from 'react';
import { View, Text } from 'react-native';
import Button from './Button';

interface Challenge {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: any;
  respondedAt?: any;
  gameType: string;
  message?: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onViewChallenge: () => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onViewChallenge }) => {
  return (
    <View style={{
      backgroundColor: '#1a1a1a',
      padding: 16,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 4,
    }}>
      <Text style={{
        color: '#fff',
        fontSize: 16,
        marginBottom: 8,
      }}>Challenge from {challenge.fromUserName}</Text>
      <Text style={{
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 8,
      }}>Game: {challenge.gameType}</Text>
      <Button title="View Challenge" onPress={onViewChallenge} />
    </View>
  );
};

export default ChallengeCard;