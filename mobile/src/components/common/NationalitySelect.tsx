import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { ChevronDown, Search, X, User } from 'lucide-react-native';
import { api } from '../../services/api';

interface NationalitySelectProps {
  value: string;
  onChange: (nationality: string) => void;
  error?: string;
  placeholder?: string;
}

export default function NationalitySelect({
  value,
  onChange,
  error,
  placeholder = 'Sélectionner une nationalité',
}: NationalitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [selectedNationality, setSelectedNationality] = useState<string | null>(null);

  useEffect(() => {
    loadNationalities();
  }, []);

  useEffect(() => {
    if (value) setSelectedNationality(value);
  }, [value]);

  const loadNationalities = async () => {
    try {
      const response = await api.get('/countries/nationalities');
      setNationalities(response.data);
    } catch (error) {
      console.error('Failed to load nationalities:', error);
    }
  };

  const handleSelect = (nationality: string) => {
    setSelectedNationality(nationality);
    onChange(nationality);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedNationality(null);
    onChange('');
  };

  const filteredNationalities = nationalities.filter(n => {
    if (!search) return true;
    return n.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <View>
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setIsOpen(true)}
      >
        {selectedNationality ? (
          <Text style={styles.selectedText}>{selectedNationality}</Text>
        ) : (
          <View style={styles.placeholderContainer}>
            <User size={16} color="#999" />
            <Text style={styles.placeholder}>{placeholder}</Text>
          </View>
        )}
        <View style={styles.rightContainer}>
          {selectedNationality && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <X size={16} color="#999" />
            </TouchableOpacity>
          )}
          <ChevronDown size={20} color="#999" />
        </View>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={isOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une nationalité</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher une nationalité..."
              />
            </View>

            <FlatList
              data={filteredNationalities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.nationalityItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.nationalityText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  selectorError: {
    borderColor: '#EF4444',
  },
  selectedText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  placeholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
    marginRight: 4,
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  nationalityItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  nationalityText: {
    fontSize: 16,
  },
});