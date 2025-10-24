import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Button from '../components/Button';

const SignUpScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { user } = await auth().createUserWithEmailAndPassword(formData.email, formData.password);
      await firestore().collection('users').doc(user.uid).set({
        fullName: formData.fullName.trim(),
        email: formData.email.toLowerCase().trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      Alert.alert('Success', 'Account created!');
      navigation.navigate('Lobby');
    } catch (error) {
      const errorMessage = error.code === 'auth/email-already-in-use' ? 'Email already in use.' : error.message || 'Signup failed.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#000000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{
          width: 100,
          height: 80,
          backgroundColor: '#F44336',
          borderRadius: 17,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 20,
          marginBottom: 30,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 40,
            fontWeight: 'bold',
          }}>X</Text>
        </View>
        <Text style={{
          color: 'white',
          fontSize: 25,
          textAlign: 'center',
          marginBottom: 20,
          fontWeight: 'bold',
        }}>Create your account</Text>
        <TextInput
          style={{
            backgroundColor: '#3E3C3C',
            width: '100%',
            maxWidth: 350,
            height: 50,
            color: 'white',
            paddingHorizontal: 15,
            borderRadius: 8,
            marginVertical: 8,
            fontSize: 16,
          }}
          placeholder="Full Name"
          placeholderTextColor="#9CA3AF"
          value={formData.fullName}
          onChangeText={(text) => handleInputChange('fullName', text)}
          editable={!loading}
        />
        <TextInput
          style={{
            backgroundColor: '#3E3C3C',
            width: '100%',
            maxWidth: 350,
            height: 50,
            color: 'white',
            paddingHorizontal: 15,
            borderRadius: 8,
            marginVertical: 8,
            fontSize: 16,
          }}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(text) => handleInputChange('email', text)}
          editable={!loading}
        />
        <TextInput
          style={{
            backgroundColor: '#3E3C3C',
            width: '100%',
            maxWidth: 350,
            height: 50,
            color: 'white',
            paddingHorizontal: 15,
            borderRadius: 8,
            marginVertical: 8,
            fontSize: 16,
          }}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoCapitalize="none"
          value={formData.password}
          onChangeText={(text) => handleInputChange('password', text)}
          editable={!loading}
        />
        <TextInput
          style={{
            backgroundColor: '#3E3C3C',
            width: '100%',
            maxWidth: 350,
            height: 50,
            color: 'white',
            paddingHorizontal: 15,
            borderRadius: 8,
            marginVertical: 8,
            fontSize: 16,
          }}
          placeholder="Confirm Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoCapitalize="none"
          value={formData.confirmPassword}
          onChangeText={(text) => handleInputChange('confirmPassword', text)}
          editable={!loading}
        />
        <Button
          title="Sign Up"
          onPress={handleSignUp}
          loading={loading}
          style={{
            width: '100%',
            maxWidth: 350,
            height: 50,
            borderRadius: 17,
            marginTop: 25,
          }}
        />
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 20,
          width: '100%',
          maxWidth: 320,
        }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#9CA3AF' }} />
          <Text style={{
            marginHorizontal: 10,
            color: '#9CA3AF',
            fontSize: 14,
          }}>or sign up with</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#9CA3AF' }} />
        </View>
        <Button
          title="Sign Up with Google"
          onPress={() => Alert.alert('Info', 'Google Sign-Up not available')}
          style={{
            width: '100%',
            maxWidth: 350,
            height: 50,
            backgroundColor: '#3E3C3C',
            borderRadius: 17,
          }}
          textStyle={{
            color: 'white',
            fontSize: 16,
          }}
        />
        <View style={{ 
          flexDirection: 'row', 
          marginTop: 20,
          marginBottom: 30,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <Text style={{ 
            color: 'white', 
            fontSize: 16 
          }}>Already have an account? </Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')} 
            disabled={loading}
          >
            <Text style={{
              color: '#F44336',
              fontWeight: 'bold',
              fontSize: 16,
              opacity: loading ? 0.7 : 1,
            }}>Login</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;