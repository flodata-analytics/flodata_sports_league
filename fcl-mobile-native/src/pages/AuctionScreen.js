import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import {colors} from '../theme/colors';

export default function AuctionScreen() {
  return (
    <ScreenContainer scroll={false}>
      <View style={styles.center}>
        <Text style={styles.title}>Auction Starting Soon!</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  title: {fontSize: 24, fontWeight: '700', color: colors.muted},
});
