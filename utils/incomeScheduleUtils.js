export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function resolvePayDate(year, month, dayOfMonth) {
  const day = Math.min(dayOfMonth, getDaysInMonth(year, month));
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function getPayDatesForMonth(payDays, year, month) {
  const uniqueDays = [...new Set(payDays)].sort((a, b) => a - b);
  return uniqueDays.map((day) => resolvePayDate(year, month, day));
}

export function formatScheduledPayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatPayDayList(payDays) {
  return payDays
    .map((day) => {
      const suffix =
        day % 10 === 1 && day !== 11
          ? 'st'
          : day % 10 === 2 && day !== 12
            ? 'nd'
            : day % 10 === 3 && day !== 13
              ? 'rd'
              : 'th';
      return `${day}${suffix}`;
    })
    .join(' & ');
}

export function parsePayDays(payDayInputs) {
  const days = payDayInputs
    .map((value) => parseInt(value, 10))
    .filter((day) => !Number.isNaN(day) && day >= 1 && day <= 31);

  return [...new Set(days)].sort((a, b) => a - b);
}

export function applyScheduleSync(transactions, schedule, year, month) {
  const payDates = getPayDatesForMonth(schedule.payDays, year, month);
  const payKeys = payDates.map(formatScheduledPayKey);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  let updated = [...transactions];

  payDates.forEach((payDate, index) => {
    const payKey = payKeys[index];
    const existingIndex = updated.findIndex(
      (t) =>
        t.type === 'income' &&
        t.scheduleId === schedule.id &&
        t.scheduledPayKey === payKey
    );

    if (existingIndex >= 0) {
      const existing = updated[existingIndex];
      if (existing.amount !== schedule.amount || existing.category !== schedule.category) {
        updated[existingIndex] = {
          ...existing,
          amount: schedule.amount,
          category: schedule.category,
        };
      }
      return;
    }

    updated.push({
      id: `${schedule.id}-${payKey}`,
      type: 'income',
      amount: schedule.amount,
      category: schedule.category,
      date: payDate.toISOString(),
      scheduleId: schedule.id,
      scheduledPayKey: payKey,
    });
  });

  updated = updated.filter((t) => {
    if (t.type !== 'income' || t.scheduleId !== schedule.id || !t.scheduledPayKey) {
      return true;
    }
    if (!t.scheduledPayKey.startsWith(monthPrefix)) {
      return true;
    }
    return payKeys.includes(t.scheduledPayKey);
  });

  return updated;
}

export function removeScheduleTransactions(transactions, scheduleId) {
  return transactions.filter((t) => t.scheduleId !== scheduleId);
}
