import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Avatar from './Avatar';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: any;
}

interface UserItemProps {
  user: User;
  onChallenge: () => void;
}

const UserItem: React.FC<UserItemProps> = ({ user, onChallenge }) => {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 4,
      borderRadius: 12,
      backgroundColor: '#1a1a1a',
    }}>
      <Avatar name={user.name} />
      <View style={{
        flex: 1,
        marginLeft: 16,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#fff',
        }}>{user.name}</Text>
        <Text style={{
          fontSize: 12,
          color: '#9ca3af',
        }}>{user.email}</Text>
      </View>
      <TouchableOpacity onPress={onChallenge} style={{
        padding: 8,
      }}>
        <Text style={{
          fontSize: 24,
        }}>⚔️</Text>
      </TouchableOpacity>
    </View>
  );
};

export default UserItem;