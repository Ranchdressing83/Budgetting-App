import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function toDateInputValue(date) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export default function DatePickerPanel({
  visible,
  value,
  onChange,
  onClose,
  title = 'Select Date',
  maximumDate,
  minimumDate,
}) {
  if (!visible) {
    return null;
  }

  const pickerValue = value || new Date();

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'web' ? (
          <View style={styles.webInputContainer}>
            <input
              type="date"
              value={toDateInputValue(pickerValue)}
              max={maximumDate ? toDateInputValue(maximumDate) : undefined}
              min={minimumDate ? toDateInputValue(minimumDate) : undefined}
              onChange={(event) => {
                const nextDate = fromDateInputValue(event.target.value);
                if (nextDate) {
                  onChange(nextDate);
                }
              }}
              style={webInputStyle}
            />
          </View>
        ) : (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              if (Platform.OS === 'android') {
                onClose();
              }
              if (date) {
                onChange(date);
              }
            }}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            style={styles.nativePicker}
          />
        )}
      </View>
    </View>
  );
}

const webInputStyle = {
  width: '100%',
  padding: 12,
  fontSize: 16,
  border: 'none',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  backgroundColor: '#fff',
  color: '#333',
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
  },
  wrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#9D5CE9',
    borderRadius: 6,
  },
  doneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  webInputContainer: {
    padding: 12,
  },
  nativePicker: {
    width: '100%',
  },
});
