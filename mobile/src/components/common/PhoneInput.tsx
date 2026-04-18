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
import { ChevronDown, Search, X } from 'lucide-react-native';
import { api } from '../../services/api';

interface PhoneCode {
  code: string;
  country: string;
  flag: string;
  display: string;
}

interface PhoneInputProps {
  value: string;
  onChange: (phoneNumber: string, countryCode: string) => void;
  error?: string;
  placeholder?: string;
}

export default function PhoneInput({
  value,
  onChange,
  error,
  placeholder = 'Numéro de téléphone',
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [phoneCodes, setPhoneCodes] = useState<PhoneCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<PhoneCode | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadPhoneCodes();
  }, []);

  const loadPhoneCodes = async () => {
    try {
      const response = await api.get('/countries/phone-codes');
      setPhoneCodes(response.data);
      const defaultCode = response.data.find((c: PhoneCode) => c.code === '243') || response.data[0];
      setSelectedCode(defaultCode);
    } catch (error) {
      console.error('Failed to load phone codes:', error);
    }
  };

  const handleCodeSelect = (code: PhoneCode) => {
    setSelectedCode(code);
    setIsOpen(false);
    setSearch('');
    onChange(phoneNumber, code.code);
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, '');
    setPhoneNumber(cleaned);
    if (selectedCode) {
      onChange(cleaned, selectedCode.code);
    }
  };

  const filteredCodes = phoneCodes.filter(c => {
    if (!search) return true;
    return (
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
    );
  });

  return (
    <View>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.codeSelector}
          onPress={() => setIsOpen(true)}
        >
          <Text style={styles.flag}>{selectedCode?.flag || '🇨🇩'}</Text>
          <Text style={styles.code}>+{selectedCode?.code || '243'}</Text>
          <ChevronDown size={16} color="#999" />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={phoneNumber}
          onChangeText={handlePhoneChange}
          placeholder={placeholder}
          keyboardType="phone-pad"
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={isOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un pays</Text>
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
                placeholder="Rechercher un pays..."
              />
            </View>

            <FlatList
              data={filteredCodes}
              keyExtractor={(item) => item.code + item.country}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => handleCodeSelect(item)}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.country}</Text>
                  <Text style={styles.countryCode}>+{item.code}</Text>
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    gap: 4,
  },
  flag: {
    fontSize: 20,
  },
  code: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#EF4444',
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
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
  },
  countryCode: {
    fontSize: 14,
    color: '#666',
  },
});