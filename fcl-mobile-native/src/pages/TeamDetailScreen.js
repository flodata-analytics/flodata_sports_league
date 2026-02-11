import React from 'react';
import {ActivityIndicator, FlatList, StyleSheet, Text} from 'react-native';
import {useRoute} from '@react-navigation/native';
import ScreenContainer from '../components/ScreenContainer';
import PlayerCard from '../components/PlayerCard';
import {useCollection, useDocument} from '../hooks/useFirestore';
import {colors} from '../theme/colors';

export default function TeamDetailScreen() {
  const {params} = useRoute();
  const {data: team} = useDocument('teams', params?.teamId);
  const {data: players, loading} = useCollection('players', 'name', [{field: 'teamId', operator: '==', value: params?.teamId}]);

  if (loading) return <ScreenContainer><ActivityIndicator color={colors.primary} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <Text style={styles.title}>{team?.name || 'Team'}</Text>
      <FlatList data={players} keyExtractor={i => i.id} renderItem={({item}) => <PlayerCard player={item} />} ItemSeparatorComponent={() => <Text style={{height: 10}} />} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12},
});
