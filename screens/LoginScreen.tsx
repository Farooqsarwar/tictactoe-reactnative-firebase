import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  Image 
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '874325842639-rkgqcu55ketos62ljfo0eo9mfq7pl2v3.apps.googleusercontent.com',
      // offlineAccess: true, // Remove this line
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      navigation.navigate('Lobby');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

const handleGoogleLogin = async () => {
  setGoogleLoading(true);
  try {
    // Check for Google Play Services
    await GoogleSignin.hasPlayServices();
    
    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();
    
    // Get the ID token - handle different response formats
    let idToken: string | null = null;
    
    // Try different possible properties
    if (userInfo.data && userInfo.data.idToken) {
      idToken = userInfo.data.idToken;
    } else if ((userInfo as any).idToken) {
      idToken = (userInfo as any).idToken;
    } else if (userInfo.idToken) {
      idToken = userInfo.idToken;
    }
    
    if (!idToken) {
      console.log('UserInfo structure:', userInfo);
      throw new Error('No ID token found in Google response');
    }

    // Create Firebase credential
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    
    // Sign in to Firebase
    await auth().signInWithCredential(googleCredential);
    
    navigation.navigate('Lobby');
  } catch (error: any) {
    console.log('Google Sign-In Error Details:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
    
    if (error.code === 'SIGN_IN_CANCELLED') {
      // User cancelled, do nothing
      return;
    } else if (error.code === 'DEVELOPER_ERROR') {
      Alert.alert(
        'Configuration Error', 
        'Please check your Google Sign-In configuration'
      );
    } else {
      Alert.alert('Google Login Failed', error.message || 'Unknown error occurred');
    }
  } finally {
    setGoogleLoading(false);
  }
};
  return (
    <ScrollView 
      contentContainerStyle={{ 
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
        backgroundColor: '#000000'
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Your existing UI code */}
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
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
      }}>Login to your account</Text>

      <TextInput
        style={{
          backgroundColor: '#3e3c3c',
          width: '100%',
          height: 50,
          color: 'white',
          paddingHorizontal: 15,
          borderRadius: 8,
          marginBottom: 15,
          fontSize: 16,
        }}
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <TextInput
        style={{
          backgroundColor: '#3e3c3c',
          width: '100%',
          height: 50,
          color: 'white',
          paddingHorizontal: 15,
          borderRadius: 8,
          marginBottom: 10,
          fontSize: 16,
        }}
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry={true}
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />
      <TouchableOpacity
        style={{
          width: '100%',
          height: 50,
          backgroundColor: '#F44336',
          borderRadius: 17,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 10,
          opacity: loading ? 0.7 : 1,
        }}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        width: '100%',
      }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#9CA3AF' }} />
        <Text style={{
          marginHorizontal: 10,
          color: '#9CA3AF',
          fontSize: 14,
        }}>or continue with</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#9CA3AF' }} />
      </View>

      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 50,
          backgroundColor: '#3e3c3c',
          borderRadius: 17,
          marginBottom: 20,
          paddingHorizontal: 20,
          opacity: googleLoading ? 0.7 : 1,
        }}
        onPress={handleGoogleLogin}
        disabled={googleLoading}
      >
        <Image
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
          style={{
            width: 24,
            height: 24,
            marginRight: 12,
          }}
          resizeMode="contain"
        />
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: '600',
        }}>
          {googleLoading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      <View style={{ 
        flexDirection: 'row', 
        marginTop: 10,
        marginBottom: 30,
      }}>
        <Text style={{ color: 'white', fontSize: 16 }}>
          Don't have an account? 
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={{
            color: '#F44336',
            fontWeight: 'bold',
            fontSize: 16,
            marginLeft: 5,
          }}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default LoginScreen;