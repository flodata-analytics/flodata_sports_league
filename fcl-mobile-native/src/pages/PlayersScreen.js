import React from 'react';
import {ActivityIndicator, FlatList, Pressable, Text} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import PlayerCard from '../components/PlayerCard';
import {useCollection} from '../hooks/useFirestore';
import {colors} from '../theme/colors';

export default function PlayersScreen({navigation}) {
  const {data: players, loading} = useCollection('players', 'name');

  if (loading) {
    return <ScreenContainer><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  }

  return (
    <ScreenContainer>
      <FlatList
        data={players}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <Pressable onPress={() => navigation.navigate('PlayerProfile', {playerId: item.id})} style={{marginBottom: 10}}>
            <PlayerCard player={item} />
          </Pressable>
        )}
        ListEmptyComponent={<Text>No players found.</Text>}
      />
    </ScreenContainer>
  );
}
