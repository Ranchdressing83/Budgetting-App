import { useTransactions } from '@/components/TransactionsContext';
import { CATEGORIES, CATEGORY_COLORS } from '@/constants/categories';
import { confirmDelete } from '@/utils/confirmAlert';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Get all unique categories from transactions
function getUniqueCategories(transactions) {
  const categories = new Set();
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      if (t.category) categories.add(t.category);
    });
  return Array.from(categories).sort();
}

// Get all unique places from transactions
function getUniquePlaces(transactions) {
  const places = new Set();
  transactions
    .filter((t) => t.type === 'expense' && t.place)
    .forEach((t) => {
      if (t.place) places.add(t.place);
    });
  return Array.from(places).sort();
}

export default function SearchScreen() {
  const router = useRouter();
  const { transactions, updateTransaction, deleteTransaction } = useTransactions();
  const [searchCategory, setSearchCategory] = useState(null);
  const [searchPlace, setSearchPlace] = useState('');
  const [searchDescription, setSearchDescription] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Eating Out(Solo)');
  const [editPlace, setEditPlace] = useState('');
  const [editDate, setEditDate] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [showEditCategoryDropdown, setShowEditCategoryDropdown] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  
  // Date range state - default to past month
  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const [fromDate, setFromDate] = useState(oneMonthAgo);
  const [toDate, setToDate] = useState(today);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const uniqueCategories = useMemo(() => getUniqueCategories(transactions), [transactions]);
  const uniquePlaces = useMemo(() => getUniquePlaces(transactions), [transactions]);

  // Filter transactions based on search criteria
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter((t) => t.type === 'expense');

    // Filter by category
    if (searchCategory) {
      filtered = filtered.filter((t) => t.category === searchCategory);
    }

    // Filter by place (case-insensitive partial match)
    if (searchPlace.trim()) {
      const placeLower = searchPlace.toLowerCase().trim();
      filtered = filtered.filter((t) => t.place && t.place.toLowerCase().includes(placeLower));
    }

    // Filter by description (case-insensitive partial match)
    if (searchDescription.trim()) {
      const descriptionLower = searchDescription.toLowerCase().trim();
      filtered = filtered.filter((t) => t.description && t.description.toLowerCase().includes(descriptionLower));
    }

    // Filter by date range
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0); // Start of day
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999); // End of day
    
    filtered = filtered.filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= from && transactionDate <= to;
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, searchCategory, searchPlace, searchDescription, fromDate, toDate]);

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = filteredTransactions.length;

  // Check if there's an active search (not just date range)
  const hasActiveSearch = searchCategory || searchPlace.trim() || searchDescription.trim();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const clearFilters = () => {
    setSearchCategory(null);
    setSearchPlace('');
    setSearchDescription('');
    // Reset to past month
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    setFromDate(oneMonthAgo);
    setToDate(today);
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditAmount(transaction.amount.toString());
    setEditCategory(transaction.category);
    setEditPlace(transaction.place || '');
    setEditDate(transaction.date ? new Date(transaction.date) : null);
    setEditDescription(transaction.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditCategory('Eating Out(Solo)');
    setEditPlace('');
    setEditDate(null);
    setEditDescription('');
    setShowEditCategoryDropdown(false);
    setShowEditDatePicker(false);
  };

  const handleSaveEdit = () => {
    const numAmount = parseFloat(editAmount);
    if (!editAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    const expenseDate = editDate || new Date();
    updateTransaction(editingId, {
      amount: numAmount,
      category: editCategory,
      place: editPlace.trim() || undefined,
      description: editDescription.trim() || undefined,
      date: expenseDate.toISOString(),
    });

    handleCancelEdit();
  };

  const handleDelete = (id) => {
    confirmDelete('Delete Expense', 'Are you sure?', () => {
      deleteTransaction(id);
      if (editingId === id) handleCancelEdit();
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/home')} activeOpacity={0.7}>
            <Image source={require('@/assets/images/logo.png')} style={styles.headerLogo} />
          </TouchableOpacity>
          <Text style={styles.title}>Search Expenses</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Date Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <View style={styles.dateRangeContainer}>
            <View style={styles.datePickerRow}>
              <Text style={styles.dateLabel}>From:</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowFromPicker(true)}>
                <Text style={styles.dateButtonText}>{formatDateDisplay(fromDate)}</Text>
              </TouchableOpacity>
            </View>
            {showFromPicker && (
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerWrapper}>
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerHeaderText}>Select From Date</Text>
                    <TouchableOpacity
                      onPress={() => setShowFromPicker(false)}
                      style={styles.datePickerDoneButton}>
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={fromDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowFromPicker(false);
                      }
                      if (selectedDate) {
                        setFromDate(selectedDate);
                      }
                    }}
                    maximumDate={toDate}
                    style={styles.datePicker}
                  />
                </View>
              </View>
            )}
            <View style={styles.datePickerRow}>
              <Text style={styles.dateLabel}>To:</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowToPicker(true)}>
                <Text style={styles.dateButtonText}>{formatDateDisplay(toDate)}</Text>
              </TouchableOpacity>
            </View>
            {showToPicker && (
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerWrapper}>
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerHeaderText}>Select To Date</Text>
                    <TouchableOpacity
                      onPress={() => setShowToPicker(false)}
                      style={styles.datePickerDoneButton}>
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={toDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowToPicker(false);
                      }
                      if (selectedDate) {
                        setToDate(selectedDate);
                      }
                    }}
                    minimumDate={fromDate}
                    maximumDate={new Date()}
                    style={styles.datePicker}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

            {/* Category Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filter by Category (Optional)</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowCategoryDropdown(true)}>
                <Text style={[styles.dropdownButtonText, { color: searchCategory ? '#333' : '#999' }]}>
                  {searchCategory || 'All Categories'}
                </Text>
                {searchCategory && (
                  <View
                    style={[
                      styles.categoryColorIndicator,
                      { backgroundColor: CATEGORY_COLORS[searchCategory] || '#9E9E9E' },
                    ]}
                  />
                )}
              </TouchableOpacity>

              <Modal
                visible={showCategoryDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCategoryDropdown(false)}>
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowCategoryDropdown(false)}>
                  <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
                    <ScrollView style={styles.dropdownScrollView}>
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          !searchCategory && {
                            backgroundColor: '#9D5CE920',
                            borderLeftWidth: 4,
                            borderLeftColor: '#9D5CE9',
                          },
                        ]}
                        onPress={() => {
                          setSearchCategory(null);
                          setShowCategoryDropdown(false);
                        }}>
                        <View style={styles.dropdownItemLeft}>
                          <Text style={[styles.dropdownItemText, !searchCategory && { fontWeight: '600' }]}>
                            All Categories
                          </Text>
                        </View>
                        {!searchCategory && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                      {CATEGORIES.map((cat) => {
                        const isSelected = searchCategory === cat;
                        const categoryColor = CATEGORY_COLORS[cat] || '#9E9E9E';
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.dropdownItem,
                              isSelected && {
                                backgroundColor: categoryColor + '20',
                                borderLeftWidth: 4,
                                borderLeftColor: categoryColor,
                              },
                            ]}
                            onPress={() => {
                              setSearchCategory(cat);
                              setShowCategoryDropdown(false);
                            }}>
                            <View style={styles.dropdownItemLeft}>
                              <View
                                style={[
                                  styles.categoryColorDot,
                                  { backgroundColor: categoryColor },
                                ]}
                              />
                              <Text style={[styles.dropdownItemText, isSelected && { fontWeight: '600' }]}>
                                {cat}
                              </Text>
                            </View>
                            {isSelected && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            {/* Place Search */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search by Place (Optional)</Text>
              <TextInput
                style={styles.input}
                value={searchPlace}
                onChangeText={setSearchPlace}
                placeholder="e.g., Chipotle, Walmart, Amazon"
                autoCapitalize="words"
              />
            </View>

            {/* Description Search */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search by Description (Optional)</Text>
              <TextInput
                style={styles.input}
                value={searchDescription}
                onChangeText={setSearchDescription}
                placeholder="e.g., lunch, birthday gift, team meeting"
                autoCapitalize="sentences"
              />
            </View>

            {/* Clear Filters Button */}
        {(searchCategory || searchPlace.trim() || searchDescription.trim()) && (
          <View style={styles.clearButtonContainer}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results Summary - Only show if there's an active search */}
        {hasActiveSearch && (
          <>
            <View style={styles.resultsSummary}>
              <Text style={styles.resultsTitle}>Results</Text>
              <Text style={styles.resultsCount}>
                {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
              </Text>
              <Text style={styles.resultsTotal}>Total: ${totalAmount.toFixed(2)}</Text>
            </View>

            {/* Transaction List */}
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No expenses found matching your search criteria.</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters or time period.</Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {filteredTransactions.map((transaction) => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={styles.transactionInfo}>
                      <View style={styles.transactionHeader}>
                        <Text style={styles.transactionCategory}>{transaction.category}</Text>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: CATEGORY_COLORS[transaction.category] || '#9E9E9E' },
                          ]}
                        />
                      </View>
                      {transaction.place && <Text style={styles.transactionPlace}>{transaction.place}</Text>}
                      {transaction.description && <Text style={styles.transactionDescription}>{transaction.description}</Text>}
                      <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={styles.transactionAmount}>${transaction.amount.toFixed(2)}</Text>
                      <View style={styles.transactionActions}>
                        <TouchableOpacity onPress={() => handleEdit(transaction)}>
                          <Text style={styles.editButton}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(transaction.id)}>
                          <Text style={styles.deleteButton}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={editingId !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.editModalTitle}>Edit Expense</Text>

              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowEditCategoryDropdown(true)}>
                <Text style={styles.dropdownButtonText}>{editCategory}</Text>
                <View
                  style={[
                    styles.categoryColorIndicator,
                    { backgroundColor: CATEGORY_COLORS[editCategory] || '#9E9E9E' },
                  ]}
                />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Place (Optional)</Text>
              <TextInput
                style={styles.input}
                value={editPlace}
                onChangeText={setEditPlace}
                placeholder="e.g., Walmart, Amazon"
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Date</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEditDatePicker(true)}>
                <Text style={styles.dateButtonText}>
                  {editDate ? formatDateDisplay(editDate) : 'Today'}
                </Text>
              </TouchableOpacity>
              {editDate && (
                <TouchableOpacity style={styles.clearDateButton} onPress={() => setEditDate(null)}>
                  <Text style={styles.clearDateText}>Clear date</Text>
                </TouchableOpacity>
              )}
              {showEditDatePicker && (
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerWrapper}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerHeaderText}>Select Date</Text>
                      <TouchableOpacity
                        onPress={() => setShowEditDatePicker(false)}
                        style={styles.datePickerDoneButton}>
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={editDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') setShowEditDatePicker(false);
                        if (selectedDate) setEditDate(selectedDate);
                      }}
                      maximumDate={new Date()}
                      style={styles.datePicker}
                    />
                  </View>
                </View>
              )}

              <Text style={styles.fieldLabel}>Description (Optional)</Text>
              <TextInput
                style={styles.input}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="e.g., lunch, birthday gift"
                multiline
                numberOfLines={3}
              />

              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditCategoryDropdown(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditCategoryDropdown(false)}>
          <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
            <ScrollView style={styles.dropdownScrollView}>
              {CATEGORIES.map((cat) => {
                const isSelected = editCategory === cat;
                const categoryColor = CATEGORY_COLORS[cat] || '#9E9E9E';
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.dropdownItem,
                      isSelected && {
                        backgroundColor: categoryColor + '20',
                        borderLeftWidth: 4,
                        borderLeftColor: categoryColor,
                      },
                    ]}
                    onPress={() => {
                      setEditCategory(cat);
                      setShowEditCategoryDropdown(false);
                    }}>
                    <View style={styles.dropdownItemLeft}>
                      <View style={[styles.categoryColorDot, { backgroundColor: categoryColor }]} />
                      <Text style={[styles.dropdownItemText, isSelected && { fontWeight: '600' }]}>
                        {cat}
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  dateRangeContainer: {
    gap: 12,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 50,
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 12,
  },
  datePickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePickerHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  datePickerDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#9D5CE9',
    borderRadius: 6,
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  datePicker: {
    width: '100%',
    alignSelf: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dropdownButtonText: {
    fontSize: 16,
    flex: 1,
  },
  categoryColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownScrollView: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  checkmark: {
    fontSize: 18,
    color: '#9D5CE9',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  clearButton: {
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsSummary: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultsTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  transactionsList: {
    paddingBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  transactionPlace: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 14,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    fontSize: 14,
    color: '#9D5CE9',
  },
  deleteButton: {
    fontSize: 14,
    color: '#d32f2f',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
  },
  clearDateText: {
    fontSize: 14,
    color: '#9D5CE9',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#9D5CE9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

