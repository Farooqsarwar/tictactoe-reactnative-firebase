import React from 'react';
import { View, Text } from 'react-native';

interface StatsRowProps {
  label: string;
  value: string | number;
}

const StatsRow: React.FC<StatsRowProps> = ({ label, value }) => {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      paddingHorizontal: 10,
    }}>
      <Text style={{
        color: '#fff',
        fontSize: 16,
      }}>{label}</Text>
      <Text style={{
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
      }}>{value}</Text>
    </View>
  );
};

export default StatsRow;