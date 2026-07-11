import { CATEGORIES, CATEGORY_COLORS } from '@/constants/categories';
import React from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function CategoryList({ selectedCategory, onSelect, onClose }) {
  return (
    <ScrollView style={styles.dropdownScrollView}>
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat;
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
              onSelect(cat);
              onClose();
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
  );
}

export default function CategoryPicker({ visible, selectedCategory, onSelect, onClose }) {
  if (!visible) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOverlay}>
        <TouchableOpacity style={styles.webBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.dropdownMenu}>
          <CategoryList
            selectedCategory={selectedCategory}
            onSelect={onSelect}
            onClose={onClose}
          />
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.dropdownMenu} onStartShouldSetResponder={() => true}>
          <CategoryList
            selectedCategory={selectedCategory}
            onSelect={onSelect}
            onClose={onClose}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1000,
          justifyContent: 'center',
          alignItems: 'center',
        }
      : {}),
  },
  webBackdrop: {
    ...(Platform.OS === 'web'
      ? {
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }
      : {}),
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
    maxWidth: 420,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    zIndex: 1001,
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
});
