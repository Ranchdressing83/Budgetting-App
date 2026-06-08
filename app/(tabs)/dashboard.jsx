import DashboardContent from '@/components/DashboardContent';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home')} activeOpacity={0.7}>
            <Image source={require('@/assets/images/logo.png')} style={styles.headerLogo} />
          </TouchableOpacity>
          <Text style={styles.title}>Dashboard</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <DashboardContent />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A0B3C',
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
