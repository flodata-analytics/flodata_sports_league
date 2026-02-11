import React from 'react';
import {ActivityIndicator, FlatList, StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import ScreenContainer from '../components/ScreenContainer';
import {useDocument} from '../hooks/useFirestore';
import {colors} from '../theme/colors';

export default function FullScorecardScreen() {
  const {params} = useRoute();
  const {data: match, loading} = useDocument('matches', params?.matchId || 'current-match');
  const innings = Array.isArray(match?.innings) ? match.innings : [];

  if (loading) return <ScreenContainer><ActivityIndicator color={colors.primary} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <Text style={styles.title}>Full Scorecard</Text>
      <FlatList
        data={innings}
        keyExtractor={(_, i) => `inng-${i}`}
        renderItem={({item, index}) => (
          <View style={styles.block}>
            <Text style={styles.inningsTitle}>Innings {index + 1}: {item?.battingTeam || '-'}</Text>
            <Text style={styles.text}>Runs: {item?.runs || 0}/{item?.wickets || 0}</Text>
            <Text style={styles.text}>Overs: {item?.overs || 0}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No innings data yet.</Text>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12},
  block: {backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10},
  inningsTitle: {fontWeight: '700', color: colors.text, marginBottom: 4},
  text: {color: '#374151'},
});
