import React from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {colors} from '../theme/colors';

export default function ScreenContainer({children, scroll = true}) {
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe}>
      <Wrapper contentContainerStyle={styles.content} style={styles.fill}>
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  fill: {flex: 1},
  content: {padding: 16, paddingBottom: 28},
});
