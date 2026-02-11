import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import {colors} from '../theme/colors';
import {useAuth} from '../context/AuthContext';

export default function LoginScreen({navigation}) {
  const {login} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async () => {
    try {
      setError('');
      await login(email.trim(), password);
      navigation.replace('MainTabs');
    } catch (e) {
      setError(e.message || 'Failed to login');
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.center}>
        <Text style={styles.title}>FCL Login</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.button} onPress={onSubmit}><Text style={styles.buttonText}>Login</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', gap: 12},
  title: {fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8},
  input: {backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12},
  button: {backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center'},
  buttonText: {color: colors.white, fontWeight: '700'},
  error: {color: colors.danger, fontSize: 12},
});
