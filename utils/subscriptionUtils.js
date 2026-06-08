import { getBiweeklyPeriodKey } from './budgetUtils';
import { getMonthKey, getWeekKey } from './insightsUtils';
import { resolvePayDate } from './incomeScheduleUtils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const FIXED_COST_FREQUENCIES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Bi-Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

export function formatFixedCostFrequency(frequency) {
  return FIXED_COST_FREQUENCIES.find((item) => item.key === frequency)?.label
    || frequency.charAt(0).toUpperCase() + frequency.slice(1);
}

function getBiweeklyDueDate(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  if (day <= 15) {
    return resolvePayDate(year, month, 1);
  }
  return resolvePayDate(year, month, 16);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSubscriptionPeriodKey(subscription, date = new Date()) {
  switch (subscription.frequency) {
    case 'daily':
      return formatDateKey(date);
    case 'weekly':
      return getWeekKey(date);
    case 'biweekly':
      return getBiweeklyPeriodKey(date);
    case 'monthly':
      return getMonthKey(date);
    case 'yearly':
      return String(date.getFullYear());
    default:
      return getMonthKey(date);
  }
}

export function getDueDate(subscription, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  switch (subscription.frequency) {
    case 'daily':
      return new Date(year, month, referenceDate.getDate(), 12, 0, 0, 0);
    case 'weekly': {
      const targetDay = subscription.dueDayOfWeek ?? 1;
      const due = new Date(referenceDate);
      due.setHours(12, 0, 0, 0);
      const diff = targetDay - due.getDay();
      due.setDate(due.getDate() + diff);
      return due;
    }
    case 'biweekly':
      return getBiweeklyDueDate(referenceDate);
    case 'monthly':
      return resolvePayDate(year, month, subscription.dueDay ?? 1);
    case 'yearly':
      return resolvePayDate(year, (subscription.dueMonth ?? 1) - 1, subscription.dueDay ?? 1);
    default:
      return resolvePayDate(year, month, subscription.dueDay ?? 1);
  }
}

export function isSubscriptionPaid(subscription, date = new Date()) {
  if (!subscription.lastPaidPeriodKey) return false;
  return subscription.lastPaidPeriodKey === getSubscriptionPeriodKey(subscription, date);
}

export function getSubscriptionDueStatus(subscription, date = new Date()) {
  if (isSubscriptionPaid(subscription, date)) {
    return { status: 'paid', label: 'Paid this period' };
  }

  const dueDate = getDueDate(subscription, date);
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { status: 'due_today', label: 'Due today' };
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return { status: 'overdue', label: `Overdue by ${days} day${days === 1 ? '' : 's'}` };
  }
  if (diffDays <= 7) {
    return { status: 'due_soon', label: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}` };
  }
  return {
    status: 'upcoming',
    label: `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  };
}

export function formatSubscriptionDueRule(subscription) {
  switch (subscription.frequency) {
    case 'daily':
      return 'Due every day';
    case 'weekly':
      return `Due every ${DAY_NAMES[subscription.dueDayOfWeek ?? 1]}`;
    case 'biweekly':
      return 'Due on the 1st and 16th of each month';
    case 'monthly': {
      const day = subscription.dueDay ?? 1;
      return `Due on the ${day}${getDaySuffix(day)} of each month`;
    }
    case 'yearly': {
      const dueMonth = (subscription.dueMonth ?? 1) - 1;
      const dueDay = subscription.dueDay ?? 1;
      const sampleDate = new Date(2026, dueMonth, dueDay);
      return `Due ${sampleDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} each year`;
    }
    default:
      return '';
  }
}

function getDaySuffix(day) {
  if (day % 10 === 1 && day !== 11) return 'st';
  if (day % 10 === 2 && day !== 12) return 'nd';
  if (day % 10 === 3 && day !== 13) return 'rd';
  return 'th';
}

export function parseDueDay(value) {
  const day = parseInt(value, 10);
  if (Number.isNaN(day) || day < 1 || day > 31) return null;
  return day;
}

export function parseDueMonth(value) {
  const month = parseInt(value, 10);
  if (Number.isNaN(month) || month < 1 || month > 12) return null;
  return month;
}
