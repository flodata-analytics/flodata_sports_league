import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import ScreenContainer from '../components/ScreenContainer';
import {useDocument} from '../hooks/useFirestore';
import {colors} from '../theme/colors';

export default function MatchDetailsScreen() {
  const {params} = useRoute();
  const {data: match, loading} = useDocument('matches', params?.matchId || 'current-match');

  if (loading) return <ScreenContainer><ActivityIndicator color={colors.primary} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <Text style={styles.title}>{match?.title || 'Match Details'}</Text>
      <View style={styles.card}><Text style={styles.label}>Venue</Text><Text style={styles.value}>{match?.venue || 'TBD'}</Text></View>
      <View style={styles.card}><Text style={styles.label}>Toss</Text><Text style={styles.value}>{match?.toss || '-'}</Text></View>
      <View style={styles.card}><Text style={styles.label}>Result</Text><Text style={styles.value}>{match?.result || 'In progress'}</Text></View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12},
  card: {backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10},
  label: {fontSize: 12, color: colors.muted},
  value: {fontSize: 14, color: colors.text, fontWeight: '600', marginTop: 3},
});
