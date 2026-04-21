import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Camera, MapPin, Video, X, ChevronDown, Upload, FileText, Lock, Globe, AlertCircle, Shield, Eye, EyeOff, Send } from 'lucide-react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Toast from 'react-native-toast-message';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface City {
  id: number;
  name: string;
  country: string;
}

interface MediaFile {
  uri: string;
  type: 'image' | 'video';
  name: string;
}

type VisibilityMode = 'anonymous' | 'visible';

export default function CreateReportScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ États pour la boîte de dialogue de visibilité
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('anonymous');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(res => res.data),
  });

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('/cities').then(res => res.data),
  });

  const categories: Category[] = categoriesData || [];
  const cities: City[] = citiesData || [];

  const createReportMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (response) => {
      Toast.show({ type: 'success', text1: 'Signalement créé avec succès !' });
      setShowVisibilityModal(false);
      navigation.goBack();
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      Toast.show({ 
        type: 'error', 
        text1: 'Erreur', 
        text2: error.response?.data?.error || 'Impossible de créer le signalement' 
      });
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie pour ajouter des médias');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      
      if (media.length >= 5) {
        Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 5 fichiers');
        return;
      }

      setMedia([...media, {
        uri: asset.uri,
        type: isVideo ? 'video' : 'image',
        name: `media_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
      }]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la caméra');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (media.length >= 5) {
        Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 5 fichiers');
        return;
      }

      setMedia([...media, {
        uri: result.assets[0].uri,
        type: 'image',
        name: `camera_${Date.now()}.jpg`,
      }]);
    }
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la localisation');
      setIsGettingLocation(false);
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc);
      Toast.show({ type: 'success', text1: 'Localisation obtenue' });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  // ✅ ÉTAPE 1 : Vérifier le formulaire et ouvrir la boîte de dialogue
  const handleSubmitClick = () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (!description.trim()) {
      Alert.alert('Erreur', 'La description est requise');
      return;
    }

    if (!categoryId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
      return;
    }

    // ✅ Ouvrir la boîte de dialogue de visibilité
    setShowVisibilityModal(true);
  };

  // ✅ ÉTAPE 2 : Publier avec le mode choisi
  const handleConfirmPublish = async () => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category_id', categoryId.toString());
      
      if (cityId) {
        formData.append('city_id', cityId.toString());
      }
      
      if (location) {
        formData.append('latitude', location.coords.latitude.toString());
        formData.append('longitude', location.coords.longitude.toString());
      }
      
      formData.append('is_live', isLive.toString());
      
      // ✅ Les champs qui impactent TOUT
      formData.append('is_anonymous', String(visibilityMode === 'anonymous'));
      formData.append('visibility_mode', visibilityMode);

      for (const file of media) {
        formData.append('media', {
          uri: file.uri,
          type: file.type === 'image' ? 'image/jpeg' : 'video/mp4',
          name: file.name,
        } as any);
      }

      createReportMutation.mutate(formData);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Erreur lors de la préparation du signalement' });
      setIsSubmitting(false);
    }
  };

  const getCategoryName = () => {
    if (!categoryId) return 'Sélectionner une catégorie';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? `${cat.icon} ${cat.name}` : 'Sélectionner une catégorie';
  };

  const getCityName = () => {
    if (!cityId) return 'Sélectionner une ville';
    const city = cities.find(c => c.id === cityId);
    return city ? `${city.name}, ${city.country}` : 'Sélectionner une ville';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau signalement</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          {/* Titre */}
          <View style={styles.field}>
            <Text style={styles.label}>Titre <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre du signalement"
              placeholderTextColor="#999"
              maxLength={255}
            />
            <Text style={styles.charCount}>{title.length}/255</Text>
          </View>

          {/* Catégorie */}
          <View style={styles.field}>
            <Text style={styles.label}>Catégorie <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={[styles.pickerButtonText, !categoryId && styles.placeholder]}>
                {getCategoryName()}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez la situation en détail..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.charCount}>{description.length}/2000</Text>
          </View>

          {/* Localisation */}
          <View style={styles.field}>
            <Text style={styles.label}>Localisation</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <MapPin size={20} color="#EF4444" />
                  <Text style={styles.locationButtonText}>
                    {location 
                      ? `Position: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}` 
                      : 'Utiliser ma position actuelle'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Ville */}
          <View style={styles.field}>
            <Text style={styles.label}>Ville</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCityPicker(true)}
            >
              <Text style={[styles.pickerButtonText, !cityId && styles.placeholder]}>
                {getCityName()}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Médias */}
          <View style={styles.field}>
            <Text style={styles.label}>Photos / Vidéos (max 5)</Text>
            <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
                <Camera size={24} color="#EF4444" />
                <Text style={styles.mediaButtonText}>Caméra</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
                <Upload size={24} color="#EF4444" />
                <Text style={styles.mediaButtonText}>Galerie</Text>
              </TouchableOpacity>
            </View>
            
            {media.length > 0 && (
              <ScrollView horizontal style={styles.mediaPreview} showsHorizontalScrollIndicator={false}>
                {media.map((item, index) => (
                  <View key={index} style={styles.mediaItem}>
                    {item.type === 'image' ? (
                      <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <Video size={32} color="#FFF" />
                        <Text style={styles.videoPlaceholderText}>Vidéo</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeMedia}
                      onPress={() => removeMedia(index)}
                    >
                      <X size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Option Live */}
          <View style={styles.field}>
            <TouchableOpacity
              style={styles.liveOption}
              onPress={() => setIsLive(!isLive)}
            >
              <Video size={24} color={isLive ? '#EF4444' : '#666'} />
              <Text style={[styles.liveOptionText, isLive && styles.liveOptionTextActive]}>
                Diffuser en direct
              </Text>
              <View style={[styles.checkbox, isLive && styles.checkboxChecked]} />
            </TouchableOpacity>
            {isLive && (
              <Text style={styles.liveHint}>
                Votre signalement sera visible comme un live en direct
              </Text>
            )}
          </View>

          {/* Information légale */}
          <View style={styles.legalBox}>
            <FileText size={16} color="#666" />
            <Text style={styles.legalText}>
              En soumettant ce signalement, vous certifiez que les informations fournies sont véridiques.
              Les fausses déclarations peuvent entraîner des poursuites.
            </Text>
          </View>

          {/* Boutons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitClick}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Publier le signalement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Catégories */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une catégorie</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setCategoryId(item.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
                    <Text style={[styles.categoryIconText, { color: item.color }]}>{item.icon}</Text>
                  </View>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {categoryId === item.id && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Villes */}
      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une ville</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={cities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setCityId(item.id);
                    setShowCityPicker(false);
                  }}
                >
                  <MapPin size={20} color="#EF4444" style={styles.cityIcon} />
                  <View>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={styles.cityCountry}>{item.country}</Text>
                  </View>
                  {cityId === item.id && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ✅ MODAL DE VISIBILITÉ - LE CHOIX QUI IMPACTE TOUT */}
      <Modal
        visible={showVisibilityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.visibilityModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Shield size={24} color="#EF4444" />
                <Text style={styles.modalTitle}>Choisissez votre mode de visibilité</Text>
              </View>
              <TouchableOpacity onPress={() => setShowVisibilityModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.visibilityModalBody} showsVerticalScrollIndicator={false}>
              {/* Information IMPORTANTE */}
              <View style={styles.visibilityImpactBox}>
                <Shield size={20} color="#8B5CF6" />
                <View style={styles.visibilityImpactContent}>
                  <Text style={styles.visibilityImpactTitle}>
                    ⚡ Votre choix s'appliquera à TOUTES les interactions
                  </Text>
                  <Text style={styles.visibilityImpactText}>
                    • Si vous choisissez <Text style={styles.bold}>Anonyme</Text> : Tous les commentaires, likes, témoignages et partages seront <Text style={styles.bold}>anonymes</Text>
                  </Text>
                  <Text style={styles.visibilityImpactText}>
                    • Si vous choisissez <Text style={styles.bold}>Visible</Text> : Tous les commentaires, likes, témoignages et partages seront <Text style={styles.bold}>visibles publiquement</Text>
                  </Text>
                  <Text style={styles.visibilityImpactWarning}>
                    ⚠️ Ce choix est définitif pour ce signalement et toutes ses interactions.
                  </Text>
                </View>
              </View>

              {/* Option Anonyme */}
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  visibilityMode === 'anonymous' && styles.visibilityOptionSelected,
                  { borderColor: visibilityMode === 'anonymous' ? '#8B5CF6' : '#DDD' }
                ]}
                onPress={() => setVisibilityMode('anonymous')}
              >
                <View style={styles.visibilityOptionHeader}>
                  <View style={[styles.visibilityIconLarge, { backgroundColor: '#8B5CF6' + '20' }]}>
                    <EyeOff size={28} color="#8B5CF6" />
                  </View>
                  <View style={styles.visibilityOptionTitleContainer}>
                    <Lock size={18} color="#8B5CF6" />
                    <Text style={[styles.visibilityOptionTitleLarge, { color: '#8B5CF6' }]}>🔒 Mode Anonyme</Text>
                  </View>
                </View>
                <Text style={styles.visibilityOptionDesc}>
                  Votre identité sera masquée. Toutes les interactions seront anonymes.
                </Text>
                <View style={styles.visibilityDetailsBox}>
                  <Text style={styles.visibilityDetailsTitle}>Ce qui sera anonyme :</Text>
                  <Text style={styles.visibilityDetail}>✓ Votre nom d'utilisateur</Text>
                  <Text style={styles.visibilityDetail}>✓ Les commentaires</Text>
                  <Text style={styles.visibilityDetail}>✓ Les likes</Text>
                  <Text style={styles.visibilityDetail}>✓ Les témoignages</Text>
                  <Text style={styles.visibilityDetail}>✓ Les partages</Text>
                </View>
                {visibilityMode === 'anonymous' && (
                  <View style={styles.selectedCheck}>
                    <View style={styles.selectedCheckInner} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Option Visible */}
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  visibilityMode === 'visible' && styles.visibilityOptionSelected,
                  { borderColor: visibilityMode === 'visible' ? '#10B981' : '#DDD' }
                ]}
                onPress={() => setVisibilityMode('visible')}
              >
                <View style={styles.visibilityOptionHeader}>
                  <View style={[styles.visibilityIconLarge, { backgroundColor: '#10B981' + '20' }]}>
                    <Eye size={28} color="#10B981" />
                  </View>
                  <View style={styles.visibilityOptionTitleContainer}>
                    <Globe size={18} color="#10B981" />
                    <Text style={[styles.visibilityOptionTitleLarge, { color: '#10B981' }]}>🌍 Mode Visible</Text>
                  </View>
                </View>
                <Text style={styles.visibilityOptionDesc}>
                  Votre identité sera publique. Toutes les interactions seront visibles.
                </Text>
                <View style={[styles.visibilityDetailsBox, { backgroundColor: '#10B981' + '10' }]}>
                  <Text style={[styles.visibilityDetailsTitle, { color: '#065F46' }]}>Ce qui sera visible :</Text>
                  <Text style={[styles.visibilityDetail, { color: '#065F46' }]}>✓ Votre nom d'utilisateur</Text>
                  <Text style={[styles.visibilityDetail, { color: '#065F46' }]}>✓ Les commentaires</Text>
                  <Text style={[styles.visibilityDetail, { color: '#065F46' }]}>✓ Les likes</Text>
                  <Text style={[styles.visibilityDetail, { color: '#065F46' }]}>✓ Les témoignages</Text>
                  <Text style={[styles.visibilityDetail, { color: '#065F46' }]}>✓ Les partages</Text>
                </View>
                {visibilityMode === 'visible' && (
                  <View style={[styles.selectedCheck, { borderColor: '#10B981' }]}>
                    <View style={[styles.selectedCheckInner, { backgroundColor: '#10B981' }]} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Résumé */}
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Résumé de votre signalement</Text>
                <Text style={styles.summaryText} numberOfLines={1}>Titre : {title}</Text>
                <Text style={styles.summaryText} numberOfLines={2}>Description : {description}</Text>
                <Text style={styles.summaryText}>Catégorie : {categories.find(c => c.id === categoryId)?.name || 'Non sélectionnée'}</Text>
              </View>

              {/* Avertissement */}
              <View style={styles.finalWarning}>
                <Text style={styles.finalWarningText}>
                  ⚠️ En cliquant sur "Confirmer et publier", vous acceptez que votre signalement et toutes ses interactions suivent le mode de visibilité choisi. Ce choix est définitif.
                </Text>
              </View>
            </ScrollView>

            {/* Boutons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowVisibilityModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  { backgroundColor: visibilityMode === 'anonymous' ? '#8B5CF6' : '#10B981' }
                ]}
                onPress={handleConfirmPublish}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Send size={18} color="#FFF" />
                    <Text style={styles.modalConfirmButtonText}>Confirmer et publier</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFF',
  },
  textArea: {
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholder: {
    color: '#999',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    gap: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    gap: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    color: '#666',
  },
  mediaPreview: {
    flexDirection: 'row',
  },
  mediaItem: {
    position: 'relative',
    marginRight: 8,
  },
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  videoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  },
  removeMedia: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  liveOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  liveOptionTextActive: {
    color: '#EF4444',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
  },
  checkboxChecked: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  liveHint: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
    marginLeft: 36,
  },
  legalBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  legalText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
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
    maxHeight: '70%',
  },
  visibilityModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  visibilityModalBody: {
    padding: 16,
  },
  visibilityImpactBox: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  visibilityImpactContent: {
    flex: 1,
  },
  visibilityImpactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B21A8',
    marginBottom: 8,
  },
  visibilityImpactText: {
    fontSize: 13,
    color: '#6B21A8',
    marginBottom: 4,
  },
  visibilityImpactWarning: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 8,
    fontStyle: 'italic',
  },
  bold: {
    fontWeight: 'bold',
  },
  visibilityOption: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  visibilityOptionSelected: {
    backgroundColor: '#F8FAFC',
  },
  visibilityOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  visibilityIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  visibilityOptionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visibilityOptionTitleLarge: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  visibilityOptionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  visibilityDetailsBox: {
    backgroundColor: '#8B5CF6' + '10',
    borderRadius: 8,
    padding: 12,
  },
  visibilityDetailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B21A8',
    marginBottom: 8,
  },
  visibilityDetail: {
    fontSize: 13,
    color: '#6B21A8',
    marginBottom: 2,
  },
  selectedCheck: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheckInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
  },
  summaryBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  finalWarning: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  finalWarningText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalConfirmButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  cityIcon: {
    marginRight: 12,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  cityCountry: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});