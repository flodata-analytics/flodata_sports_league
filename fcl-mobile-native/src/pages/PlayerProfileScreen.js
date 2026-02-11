import React from 'react';
import {ActivityIndicator, Image, StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import ScreenContainer from '../components/ScreenContainer';
import {useDocument} from '../hooks/useFirestore';
import {colors} from '../theme/colors';

export default function PlayerProfileScreen() {
  const {params} = useRoute();
  const {data: player, loading} = useDocument('players', params?.playerId);

  if (loading) return <ScreenContainer><ActivityIndicator color={colors.primary} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        {player?.avatarUrl ? <Image source={{uri: player.avatarUrl}} style={styles.avatar} /> : null}
        <Text style={styles.name}>{player?.name}</Text>
        <Text style={styles.meta}>{player?.role} • {player?.teamName || 'Free agent'}</Text>
      </View>
      <Text style={styles.section}>Stats</Text>
      <Text style={styles.value}>Runs: {player?.stats?.runs || 0}</Text>
      <Text style={styles.value}>Wickets: {player?.stats?.wickets || 0}</Text>
      <Text style={styles.value}>Matches: {player?.stats?.matches || 0}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {alignItems: 'center', gap: 4, marginBottom: 10},
  avatar: {width: 120, height: 120, borderRadius: 60},
  name: {fontSize: 22, fontWeight: '700', color: colors.text},
  meta: {fontSize: 14, color: colors.muted},
  section: {marginTop: 8, fontSize: 16, fontWeight: '700', color: colors.text},
  value: {marginTop: 4, color: '#374151'},
});
