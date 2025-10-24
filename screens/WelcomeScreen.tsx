import React from 'react';
import { View, Text } from 'react-native';
import Button from '../components/Button';

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000000',
      padding: 20,
    }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{
          width: 100,
          height: 80,
          backgroundColor: '#F44336',
          borderRadius: 17,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 40,
            fontWeight: 'bold',
          }}>X</Text>
        </View>
        <View style={{ height: 20 }} />
        <Text style={{
          color: '#F44336',
          textAlign: 'center',
          fontSize: 30,
          fontFamily: 'Times New Roman',
        }}>Tic Tac Toe</Text>
        <View style={{ height: 20 }} />
        <Text style={{
          color: 'white',
          textAlign: 'center',
          fontSize: 20,
          fontFamily: 'Times New Roman',
        }}>Challenge Your Friend In Real Time</Text>
        <View style={{ height: 40 }} />
        <Button
          title="Login"
          onPress={() => navigation.navigate('Login')}
          style={{
            width: 300,
            height: 50,
            borderRadius: 10,
          }}
        />
        <View style={{ height: 15 }} />
        <Button
          title="Sign Up"
          onPress={() => navigation.navigate('Signup')}
          style={{
            width: 300,
            height: 50,
            borderRadius: 10,
            backgroundColor: 'transparent',
            borderColor: '#F44336',
            borderWidth: 2,
          }}
          textStyle={{
            color: '#F44336',
          }}
        />
      </View>
    </View>
  );
};

export default WelcomeScreen;