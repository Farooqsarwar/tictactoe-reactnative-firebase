import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

interface BoardProps {
  board: string[];
  onCellPress: (index: number) => void;
  disabled: boolean;
}

const Board: React.FC<BoardProps> = ({ board, onCellPress, disabled }) => {
  return (
    <View style={{
      width: 300,
      height: 300,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignSelf: 'center',
      margin: 20,
    }}>
      {board.map((cell, index) => (
        <TouchableOpacity
          key={index}
          style={{
            width: '33.33%',
            height: '33.33%',
            borderWidth: 1,
            borderColor: '#333',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#222',
          }}
          onPress={() => onCellPress(index)}
          disabled={disabled || cell !== ''}
        >
          <Text style={{
            fontSize: 40,
            color: cell === 'O' ? '#00ff00' : '#fff',
          }}>
            {cell === 'X' ? '❌' : cell === 'O' ? '⭕' : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default Board;