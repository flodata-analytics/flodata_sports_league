import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';

export default function PlayerCard({player}) {
  return (
    <View style={styles.card}>
      {player?.avatarUrl ? <Image source={{uri: player.avatarUrl}} style={styles.avatar} /> : <View style={styles.placeholder}><Text style={styles.initial}>{(player?.name || '?')[0]}</Text></View>}
      <View style={styles.body}>
        <Text style={styles.name}>{player?.name || 'Unknown player'}</Text>
        <Text style={styles.role}>{player?.role || 'Player'} {player?.teamName ? `• ${player.teamName}` : ''}</Text>
      </View>
      {player?.credits ? <Text style={styles.credits}>{player.credits} cr</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12},
  avatar: {width: 48, height: 48, borderRadius: 24},
  placeholder: {width: 48, height: 48, borderRadius: 24, backgroundColor: '#dfe8fb', alignItems: 'center', justifyContent: 'center'},
  initial: {color: colors.primary, fontWeight: '700'},
  body: {flex: 1},
  name: {fontSize: 15, fontWeight: '700', color: colors.text},
  role: {fontSize: 12, color: colors.muted, marginTop: 2},
  credits: {fontSize: 12, color: colors.gold, fontWeight: '700'},
});
