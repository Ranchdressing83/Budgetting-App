import { COLORS } from '@/constants/colors';
import { formatCurrency } from '@/utils/scorecardUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function BudgetHealthWidget({ health, showProgressBar = true }) {
  if (!health || health.budgetAmount <= 0) return null;

  const percentage = Math.min(health.percentage, 100);
  const barColor =
    health.percentage >= 100
      ? COLORS.error
      : health.percentage >= 90
        ? COLORS.warning
        : health.percentage >= 75
          ? '#FFC107'
          : COLORS.forestGreen;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{health.budgetName}</Text>
      <Text style={styles.amounts}>
        {formatCurrency(health.spent)} / {formatCurrency(health.budgetAmount)}
      </Text>
      {showProgressBar && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
        </View>
      )}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Remaining</Text>
          <Text style={[styles.statValue, health.remaining < 0 && { color: COLORS.error }]}>
            {formatCurrency(health.remaining)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Safe Daily Spend</Text>
          <Text style={styles.statValue}>
            {formatCurrency(Math.max(0, health.safeDailySpend))}/day
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.tileBackground,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 8,
  },
  amounts: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 10,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
});
