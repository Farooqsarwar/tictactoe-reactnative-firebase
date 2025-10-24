import React from 'react';
import { View, Text, Image } from 'react-native';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ name, uri, size = 48 }) => {
  return (
    <View style={{
      backgroundColor: '#f436369b',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: size / 2,
    }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            resizeMode: 'cover',
          }}
        />
      ) : (
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#fff',
        }}>{name.charAt(0).toUpperCase()}</Text>
      )}
    </View>
  );
};

export default Avatar;