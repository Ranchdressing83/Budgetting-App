import { COLORS } from '@/constants/colors';
import { formatCurrency, formatPaceLabel, formatSignedCurrency } from '@/utils/scorecardUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

function getPaceColor(paceDelta) {
  if (paceDelta == null) return COLORS.gray;
  if (Math.abs(paceDelta) <= 2) return COLORS.primary;
  if (paceDelta < 0) return COLORS.accent;
  if (paceDelta <= 10) return COLORS.warning;
  return COLORS.error;
}

function PaceLabel({ paceDelta }) {
  const label = formatPaceLabel(paceDelta);
  if (!label) return null;

  return (
    <Text style={[styles.paceLabel, { color: getPaceColor(paceDelta) }]}>{label}</Text>
  );
}

function ScorecardRow({ label, value, valueColor }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function GradeBadge({ grade }) {
  const gradeColors = {
    A: COLORS.accent,
    B: COLORS.primary,
    C: COLORS.warning,
    D: '#FF7043',
    F: COLORS.error,
  };

  return (
    <View style={[styles.gradeBadge, { backgroundColor: gradeColors[grade] || COLORS.gray }]}>
      <Text style={styles.gradeText}>{grade}</Text>
    </View>
  );
}

export default function FinancialScorecard({ scorecard, compact = false }) {
  if (!scorecard) return null;

  const {
    monthLabel,
    periodLabel,
    income,
    fixedCosts,
    spending,
    savings,
    investments,
    netCashFlow,
    savingsRate,
    budgetGrade,
    paceDelta,
    availableSpendingRemaining,
  } = scorecard;

  const subtitle = periodLabel || monthLabel;
  const spendingLabel = fixedCosts != null ? 'Lifestyle Spending' : 'Spending';

  const netCashFlowColor = netCashFlow >= 0 ? COLORS.accent : COLORS.error;

  if (compact) {
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>{subtitle}</Text>
          {budgetGrade && (
            <View style={styles.gradeContainer}>
              <GradeBadge grade={budgetGrade} />
              <PaceLabel paceDelta={paceDelta} />
            </View>
          )}
        </View>
        <View style={styles.compactGrid}>
          <View style={styles.compactMetric}>
            <Text style={styles.compactLabel}>Income</Text>
            <Text style={styles.compactValue}>{formatCurrency(income)}</Text>
          </View>
          <View style={styles.compactMetric}>
            <Text style={styles.compactLabel}>{spendingLabel}</Text>
            <Text style={styles.compactValue}>{formatCurrency(spending)}</Text>
          </View>
          <View style={styles.compactMetric}>
            <Text style={styles.compactLabel}>Savings</Text>
            <Text style={styles.compactValue}>{formatCurrency(savings)}</Text>
          </View>
          <View style={styles.compactMetric}>
            <Text style={styles.compactLabel}>Investments</Text>
            <Text style={styles.compactValue}>{formatCurrency(investments)}</Text>
          </View>
          <View style={styles.compactMetric}>
            <Text style={styles.compactLabel}>Net Flow</Text>
            <Text style={[styles.compactValue, { color: netCashFlowColor }]}>
              {formatSignedCurrency(netCashFlow)}
            </Text>
          </View>
          {availableSpendingRemaining !== null && (
            <View style={styles.compactMetric}>
              <Text style={styles.compactLabel}>Remaining</Text>
              <Text style={styles.compactValue}>{formatCurrency(availableSpendingRemaining)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Financial Scorecard</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {budgetGrade && (
          <View style={styles.gradeContainer}>
            <Text style={styles.gradeLabel}>Budget Grade</Text>
            <GradeBadge grade={budgetGrade} />
            <PaceLabel paceDelta={paceDelta} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <ScorecardRow label="Income" value={formatCurrency(income)} />
        {fixedCosts != null && (
          <ScorecardRow label="Fixed Costs" value={formatCurrency(fixedCosts)} />
        )}
        <ScorecardRow label={spendingLabel} value={formatCurrency(spending)} />
        <ScorecardRow label="Savings" value={formatCurrency(savings)} />
        <ScorecardRow label="Investments" value={formatCurrency(investments)} />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <ScorecardRow
          label="Net Cash Flow"
          value={formatSignedCurrency(netCashFlow)}
          valueColor={netCashFlowColor}
        />
        <ScorecardRow
          label="Savings Rate"
          value={savingsRate !== null ? `${savingsRate.toFixed(0)}%` : '—'}
        />
        {availableSpendingRemaining !== null && (
          <ScorecardRow
            label="Available Spending Remaining"
            value={formatCurrency(availableSpendingRemaining)}
            valueColor={availableSpendingRemaining >= 0 ? COLORS.accent : COLORS.error}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  gradeContainer: {
    alignItems: 'center',
  },
  gradeLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gradeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  paceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 14,
  },
  compactCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactMetric: {
    width: '47%',
  },
  compactLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
});
