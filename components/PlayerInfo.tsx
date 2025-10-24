import React from 'react';
import { View, Text } from 'react-native';
import Avatar from './Avatar';

interface PlayerInfoProps {
  name: string;
  symbol: string;
  avatarUri?: string;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ name, symbol, avatarUri }) => {
  return (
    <View style={{
      alignItems: 'center',
    }}>
      <Avatar name={name} uri={avatarUri} size={40} />
      <Text style={{
        color: '#fff',
        fontSize: 14,
        marginTop: 5,
      }}>{name} ({symbol})</Text>
    </View>
  );
};

export default PlayerInfo;