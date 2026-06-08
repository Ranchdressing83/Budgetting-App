import { useBudget } from '@/components/BudgetContext';
import DashboardContent from '@/components/DashboardContent';
import { useTransactions } from '@/components/TransactionsContext';
import { COLORS } from '@/constants/colors';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { calculateSocialSpending, generateInsights } from '@/utils/insightsUtils';
import { formatCurrency } from '@/utils/scorecardUtils';

function InsightIcon({ type }) {
  const iconMap = {
    weekly: '📊',
    monthly: '📅',
    category: '🏷️',
    budget: '💰',
    social: '🎉',
  };
  return <Text style={styles.icon}>{iconMap[type] || '💡'}</Text>;
}

function InsightCard({ insight }) {
  const cardColorMap = {
    weekly: COLORS.seaBlue,
    monthly: COLORS.purple,
    category: COLORS.accent,
    budget: COLORS.warning,
    social: COLORS.purple,
  };

  const borderColor = cardColorMap[insight.type] || COLORS.gray;

  return (
    <View style={[styles.insightCard, { borderLeftColor: borderColor }]}>
      <View style={styles.insightHeader}>
        <InsightIcon type={insight.type} />
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
    </View>
  );
}

function SocialSpendingSection({ social }) {
  if (!social || social.monthlySocialSpend <= 0) return null;

  return (
    <View style={styles.socialSection}>
      <Text style={styles.sectionTitle}>Social Life</Text>
      <Text style={styles.socialSubtitle}>{social.monthLabel}</Text>
      <View style={styles.socialGrid}>
        <View style={styles.socialMetric}>
          <Text style={styles.socialLabel}>Social Spending</Text>
          <Text style={styles.socialValue}>{formatCurrency(social.monthlySocialSpend)}</Text>
        </View>
        <View style={styles.socialMetric}>
          <Text style={styles.socialLabel}>Social Days</Text>
          <Text style={styles.socialValue}>{social.socialDays}</Text>
        </View>
        <View style={styles.socialMetric}>
          <Text style={styles.socialLabel}>Avg / Night</Text>
          <Text style={styles.socialValue}>{formatCurrency(social.averageCostPerSocialDay)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { transactions } = useTransactions();
  const { budgets } = useBudget();

  const insights = useMemo(() => {
    return generateInsights(transactions, budgets);
  }, [transactions, budgets]);

  const socialSpending = useMemo(() => {
    return calculateSocialSpending(transactions);
  }, [transactions]);

  const nonSocialInsights = insights.filter((insight) => insight.type !== 'social');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home')} activeOpacity={0.7}>
            <Image source={require('@/assets/images/logo.png')} style={styles.headerLogo} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>Smart analysis of your spending patterns</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.dashboardSection}>
          <DashboardContent />
        </View>

        <SocialSpendingSection social={socialSpending} />

        <View style={styles.insightsSectionHeader}>
          <Text style={styles.sectionTitle}>Spending Insights</Text>
        </View>

        {nonSocialInsights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No insights available yet</Text>
            <Text style={styles.emptySubtext}>
              Add more transactions to see personalized insights about your spending patterns.
            </Text>
          </View>
        ) : (
          nonSocialInsights.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
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
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dashboardSection: {
    marginBottom: 24,
  },
  socialSection: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 16,
    marginBottom: 24,
  },
  socialSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialMetric: {
    width: '30%',
    minWidth: 90,
  },
  socialLabel: {
    fontSize: 11,
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  socialValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  insightsSectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  insightCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    flex: 1,
  },
  insightMessage: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});
