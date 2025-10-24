// import React, { useState, useEffect } from 'react';
// import { View, Text, SafeAreaView, Alert } from 'react-native';
// import auth from '@react-native-firebase/auth';
// import firestore from '@react-native-firebase/firestore';
// import StatsRow from '../components/StatsRow';

// interface UserStats {
//   wins: number;
//   losses: number;
//   draws: number;
//   streak: number;
// }

// const StatsScreen = () => {
//   const [userStats, setUserStats] = useState<UserStats | null>(null);
//   const [loading, setLoading] = useState(true);
//   const currentUser = auth().currentUser;

//   useEffect(() => {
//     if (!currentUser) {
//       Alert.alert('Error', 'User not logged in');
//       return;
//     }
//     const fetchUserStats = async () => {
//       try {
//         const userStatsDoc = await firestore().collection('userStats').doc(currentUser.uid).get();
//         if (userStatsDoc.exists) {
//           const data = userStatsDoc.data();
//           setUserStats({
//             wins: data?.wins || 0,
//             losses: data?.losses || 0,
//             draws: data?.draws || 0,
//             streak: data?.streak || 0,
//           });
//         } else {
//           setUserStats({ wins: 0, losses: 0, draws: 0, streak: 0 });
//         }
//       } catch (error) {
//         console.error('Error fetching user stats:', error);
//         Alert.alert('Error', 'Failed to load stats');
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUserStats();
//   }, [currentUser]);

//   if (loading) {
//     return (
//       <SafeAreaView style={{
//         flex: 1,
//         backgroundColor: '#000',
//         padding: 20,
//       }}>
//         <Text style={{
//           color: '#fff',
//           fontSize: 18,
//           textAlign: 'center',
//           marginTop: 50,
//         }}>Loading stats...</Text>
//       </SafeAreaView>
//     );
//   }

//   if (!userStats) {
//     return (
//       <SafeAreaView style={{
//         flex: 1,
//         backgroundColor: '#000',
//         padding: 20,
//       }}>
//         <Text style={{
//           color: '#fff',
//           fontSize: 18,
//           textAlign: 'center',
//           marginTop: 50,
//         }}>No stats available</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{
//       flex: 1,
//       backgroundColor: '#000',
//       padding: 20,
//     }}>
//       <Text style={{
//         color: '#fff',
//         fontSize: 24,
//         fontWeight: 'bold',
//         textAlign: 'center',
//         marginBottom: 30,
//       }}>Game Results</Text>
//       <View style={{
//         marginBottom: 20,
//       }}>
//         <Text style={{
//           color: '#fff',
//           fontSize: 18,
//           fontWeight: 'bold',
//           marginBottom: 15,
//         }}>Your Stats</Text>
//         <StatsRow label="Wins" value={userStats.wins} />
//         <StatsRow label="Losses" value={userStats.losses} />
//         <StatsRow label="Draws" value={userStats.draws} />
//         <StatsRow label="Streak" value={`${userStats.streak} Wins`} />
//       </View>
//       <View style={{
//         height: 1,
//         backgroundColor: '#333',
//         marginVertical: 20,
//       }} />
//       <View style={{
//         marginBottom: 20,
//       }}>
//         <Text style={{
//           color: '#fff',
//           fontSize: 18,
//           fontWeight: 'bold',
//           marginBottom: 15,
//         }}>Leaderboard</Text>
//         <View style={{
//           flexDirection: 'row',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//           paddingHorizontal: 10,
//         }}>
//           <Text style={{
//             color: '#fff',
//             fontSize: 16,
//             fontWeight: 'bold',
//           }}>Ethan Carter</Text>
//           <Text style={{
//             color: '#fff',
//             fontSize: 16,
//           }}>1200 points</Text>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default StatsScreen;