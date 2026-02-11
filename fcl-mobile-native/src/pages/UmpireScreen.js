import React, {useMemo} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, Text, View} from 'react-native';
import {doc, updateDoc} from 'firebase/firestore';
import ScreenContainer from '../components/ScreenContainer';
import {useCollection, useDocument} from '../hooks/useFirestore';
import {db} from '../firebase';
import {colors} from '../theme/colors';

function BallButton({label, onPress}) {
  return <Text onPress={onPress} style={styles.ballBtn}>{label}</Text>;
}

export default function UmpireScreen() {
  const {data: match, loading} = useDocument('matches', 'current-match');
  const {data: inningsData} = useCollection('innings', 'createdAt', [{field: 'matchId', operator: '==', value: 'current-match'}], 1);
  const innings = useMemo(() => inningsData[0] || {}, [inningsData]);

  const updateBall = async outcome => {
    if (!match?.id) return;
    const currentRuns = Number(match?.team1?.runs || 0);
    const currentWkts = Number(match?.team1?.wickets || 0);
    await updateDoc(doc(db, 'matches', match.id), {
      'team1.runs': outcome === 'W' ? currentRuns : currentRuns + Number(outcome || 0),
      'team1.wickets': outcome === 'W' ? currentWkts + 1 : currentWkts,
      lastBall: outcome,
    });
  };

  if (loading) return <ScreenContainer><ActivityIndicator color={colors.primary} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <Text style={styles.title}>Umpire Panel</Text>
      <Text style={styles.sub}>Current Over: {innings?.overNumber || 1}</Text>
      <View style={styles.actions}>
        {['0', '1', '2', '3', '4', '6', 'W'].map(v => <BallButton key={v} label={v} onPress={() => updateBall(v)} />)}
      </View>
      <FlatList
        data={match?.recentBalls || []}
        keyExtractor={(item, i) => `${item}-${i}`}
        horizontal
        renderItem={({item}) => <View style={styles.ballChip}><Text>{item}</Text></View>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 20, fontWeight: '700', marginBottom: 4, color: colors.text},
  sub: {fontSize: 13, color: colors.muted, marginBottom: 12},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16},
  ballBtn: {backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, minWidth: 42, textAlign: 'center', paddingVertical: 10, borderRadius: 8, fontWeight: '700', color: colors.primary},
  ballChip: {paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eef2ff', borderRadius: 999, marginRight: 8},
});
