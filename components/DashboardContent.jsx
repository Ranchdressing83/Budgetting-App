import { useBudget } from '@/components/BudgetContext';
import BudgetHealthWidget from '@/components/BudgetHealthWidget';
import FinancialScorecard from '@/components/FinancialScorecard';
import { useTransactions } from '@/components/TransactionsContext';
import {
  BUDGET_PERIOD_BIWEEKLY,
  calculateBudgetHealth,
  calculateBudgetSpending,
  findBudget,
  getBiweeklyPeriodKey,
} from '@/utils/budgetUtils';
import { calculateBiweeklyScorecard } from '@/utils/scorecardUtils';
import React, { useMemo } from 'react';
import { View } from 'react-native';

export default function DashboardContent() {
  const { transactions } = useTransactions();
  const { budgets } = useBudget();

  const budgetHealth = useMemo(() => {
    const now = new Date();
    const biweeklyKey = getBiweeklyPeriodKey(now);
    const overallBudget =
      findBudget(budgets, 'Overall Spending', BUDGET_PERIOD_BIWEEKLY, biweeklyKey) ||
      findBudget(budgets, 'Overall', BUDGET_PERIOD_BIWEEKLY, biweeklyKey);

    if (!overallBudget) return null;

    const spending = calculateBudgetSpending(overallBudget, transactions, biweeklyKey);
    return calculateBudgetHealth(overallBudget, spending, now);
  }, [budgets, transactions]);

  const scorecard = useMemo(() => {
    return calculateBiweeklyScorecard(transactions, budgets);
  }, [transactions, budgets]);

  return (
    <View>
      <FinancialScorecard scorecard={scorecard} />
      <BudgetHealthWidget health={budgetHealth} />
    </View>
  );
}
