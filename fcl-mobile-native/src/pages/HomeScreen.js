import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import LiveScoreboardCard from '../components/LiveScoreboardCard';
import {useDocument} from '../hooks/useFirestore';
import {colors} from '../theme/colors';

export default function HomeScreen() {
  const {data: match, loading} = useDocument('matches', 'current-match');

  return (
    <ScreenContainer>
      <Text style={styles.heading}>FCL 2025</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : <LiveScoreboardCard match={match} />}
      <View style={styles.notice}><Text style={styles.noticeText}>Auction, Team Sheet, Match Details and full Umpire workflow are available in dedicated tabs/screens exactly mapped from the web routes.</Text></View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16},
  notice: {marginTop: 14, borderRadius: 10, padding: 12, backgroundColor: '#f2f7ff', borderWidth: 1, borderColor: '#dbe7ff'},
  noticeText: {fontSize: 12, color: '#29416f'},
});
