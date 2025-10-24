import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: object;
  textStyle?: object;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ title, onPress, disabled, style, textStyle, loading }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: '#F44336',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: (disabled || loading) ? 0.7 : 1,
        ...style,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{
          color: '#fff',
          fontSize: 16,
          fontWeight: 'bold',
          ...textStyle,
        }}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;