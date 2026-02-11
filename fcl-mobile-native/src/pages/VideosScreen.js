import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

export default function VideosScreen() {
  return (
    <ScreenContainer scroll={false}>
      <View style={styles.center}>
        <Text style={styles.text}>No videos available now</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  text: {fontSize: 18, color: '#9ca3af'},
});
