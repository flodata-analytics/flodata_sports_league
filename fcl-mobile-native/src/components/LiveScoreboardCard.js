import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

export default function LiveScoreboardCard({match}) {
  const t1 = match?.team1?.name || 'Team 1';
  const t2 = match?.team2?.name || 'Team 2';
  const score1 = `${match?.team1?.runs || 0}/${match?.team1?.wickets || 0}`;
  const score2 = `${match?.team2?.runs || 0}/${match?.team2?.wickets || 0}`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Live Score</Text>
      <View style={styles.row}><Text style={styles.team}>{t1}</Text><Text style={styles.score}>{score1}</Text></View>
      <View style={styles.row}><Text style={styles.team}>{t2}</Text><Text style={styles.score}>{score2}</Text></View>
      <Text style={styles.meta}>{match?.status || 'Match in progress'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {backgroundColor: colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8},
  title: {fontSize: 17, fontWeight: '700', color: colors.text},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  team: {fontSize: 15, color: colors.text, fontWeight: '600'},
  score: {fontSize: 16, color: colors.primary, fontWeight: '700'},
  meta: {fontSize: 13, color: colors.muted},
});
