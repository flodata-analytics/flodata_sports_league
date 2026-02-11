import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';

export default function ProfileScreen({navigation}) {
  const {currentUser, userProfile, logout} = useAuth();

  const onLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <ScreenContainer>
      <Text style={styles.name}>{userProfile?.displayName || currentUser?.email || 'User'}</Text>
      <Text style={styles.meta}>Coins: {userProfile?.coins || 0}</Text>
      <Text style={styles.meta}>Role: {userProfile?.isAdmin ? 'Admin' : 'Fan'}</Text>
      <Pressable style={styles.button} onPress={onLogout}><Text style={styles.buttonText}>Logout</Text></Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  name: {fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 6},
  meta: {fontSize: 14, color: colors.muted, marginBottom: 4},
  button: {marginTop: 18, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center'},
  buttonText: {color: colors.white, fontWeight: '700'},
});
