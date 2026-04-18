import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Filter, X } from 'lucide-react-native';

interface FilterOption {
  label: string;
  value: string;
}

interface ReportFiltersProps {
  categories: Array<{ id: number; name: string; icon: string }>;
  onFilterChange: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

export interface FilterValues {
  category_id: string;
  status: string;
  sort: string;
}

export default function ReportFilters({
  categories,
  onFilterChange,
  initialFilters,
}: ReportFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(
    initialFilters || {
      category_id: '',
      status: 'approved',
      sort: 'created_at',
    }
  );

  const statusOptions: FilterOption[] = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Approuvés', value: 'approved' },
    { label: 'En attente', value: 'pending' },
    { label: 'Rejetés', value: 'rejected' },
  ];

  const sortOptions: FilterOption[] = [
    { label: 'Plus récents', value: 'created_at' },
    { label: 'Plus vus', value: 'views_count' },
    { label: 'Plus likés', value: 'likes_count' },
  ];

  const handleApply = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      category_id: '',
      status: 'approved',
      sort: 'created_at',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
    setIsOpen(false);
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v && v !== 'approved' && v !== 'created_at'
  ).length;

  return (
    <>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setIsOpen(true)}
      >
        <Filter color="#666" size={20} />
        {activeFiltersCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.sectionTitle}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                <TouchableOpacity
                  style={[styles.chip, !filters.category_id && styles.chipActive]}
                  onPress={() => setFilters({ ...filters, category_id: '' })}
                >
                  <Text style={[styles.chipText, !filters.category_id && styles.chipTextActive]}>
                    Toutes
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      filters.category_id === cat.id.toString() && styles.chipActive,
                    ]}
                    onPress={() => setFilters({ ...filters, category_id: cat.id.toString() })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.category_id === cat.id.toString() && styles.chipTextActive,
                      ]}
                    >
                      {cat.icon} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Statut</Text>
              <View style={styles.optionContainer}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      filters.status === option.value && styles.optionActive,
                    ]}
                    onPress={() => setFilters({ ...filters, status: option.value })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.status === option.value && styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Trier par</Text>
              <View style={styles.optionContainer}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      filters.sort === option.value && styles.optionActive,
                    ]}
                    onPress={() => setFilters({ ...filters, sort: option.value })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.sort === option.value && styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                <Text style={styles.applyButtonText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  chipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextActive: {
    color: '#FFF',
  },
  optionContainer: {
    marginBottom: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionActive: {
    backgroundColor: '#FEE2E2',
  },
  optionText: {
    fontSize: 15,
    color: '#666',
  },
  optionTextActive: {
    color: '#EF4444',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#666',
    fontSize: 16,
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});