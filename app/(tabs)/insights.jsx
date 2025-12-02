import { useBudget } from '@/components/BudgetContext';
import { useTransactions } from '@/components/TransactionsContext';
import { COLORS } from '@/constants/colors';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { generateInsights } from '@/utils/insightsUtils';

// Icon component for insight types
function InsightIcon({ type }) {
  const iconMap = {
    weekly: '📊',
    monthly: '📅',
    category: '🏷️',
    budget: '💰',
  };
  return <Text style={styles.icon}>{iconMap[type] || '💡'}</Text>;
}

// Insight card component
function InsightCard({ insight }) {
  const cardColorMap = {
    weekly: COLORS.seaBlue,
    monthly: COLORS.purple,
    category: COLORS.forestGreen,
    budget: COLORS.warning,
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

export default function InsightsScreen() {
  const { transactions } = useTransactions();
  const { budgets } = useBudget();
  
  // Generate insights whenever transactions or budgets change
  const insights = useMemo(() => {
    return generateInsights(transactions, budgets);
  }, [transactions, budgets]);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>Smart analysis of your spending patterns</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {insights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No insights available yet</Text>
            <Text style={styles.emptySubtext}>
              Add more transactions to see personalized insights about your spending patterns.
            </Text>
          </View>
        ) : (
          <View style={styles.insightsList}>
            {insights.map((insight, index) => (
              <View key={index} style={index < insights.length - 1 ? styles.insightCardWrapper : null}>
                <InsightCard insight={insight} />
              </View>
            ))}
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.forestGreen,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
  },
  insightsList: {
    padding: 20,
  },
  insightCardWrapper: {
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
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
    fontWeight: 'bold',
    color: COLORS.darkGray,
    flex: 1,
  },
  insightMessage: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

