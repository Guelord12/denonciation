import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import {
  Video,
  Lock,
  DollarSign,
  Info,
  ChevronRight,
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Image as ImageIcon,
  Filter,
  Sparkles,
  Mic,
  MicOff,
  Camera as CameraIcon,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Types
interface VideoFilter {
  id: string;
  name: string;
  type: 'beauty' | 'color' | 'effect';
  config: any;
  preview: string;
}

interface Channel {
  id: number;
  channel_name: string;
  is_premium: boolean;
  subscription_price: number;
  total_subscribers: number;
}

// Filtres vidéo prédéfinis
const VIDEO_FILTERS: VideoFilter[] = [
  { id: 'none', name: 'Aucun', type: 'color', config: {}, preview: '' },
  { id: 'beauty', name: 'Beauté', type: 'beauty', config: { smoothness: 0.5 }, preview: '✨' },
  { id: 'vivid', name: 'Vibrant', type: 'color', config: { saturation: 1.3 }, preview: '🌈' },
  { id: 'warm', name: 'Chaud', type: 'color', config: { temperature: 1.2 }, preview: '☀️' },
  { id: 'cool', name: 'Froid', type: 'color', config: { temperature: 0.8 }, preview: '❄️' },
  { id: 'vintage', name: 'Vintage', type: 'effect', config: { sepia: 0.5 }, preview: '📷' },
  { id: 'blur', name: 'Flou artistique', type: 'effect', config: { blur: 5 }, preview: '🌫️' },
];

export default function CreateLiveScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const cameraRef = useRef<Camera>(null);

  // États du formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  
  // États de planification
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // États de la caméra
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isMuted, setIsMuted] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [selectedFilter, setSelectedFilter] = useState<VideoFilter>(VIDEO_FILTERS[0]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // États de localisation
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [includeLocation, setIncludeLocation] = useState(true);
  
  // États UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Infos, 2: Caméra, 3: Planification

  // Récupérer les chaînes de l'utilisateur
  const { data: channels } = useQuery({
    queryKey: ['user-channels', user?.id],
    queryFn: () => api.get('/channels/my').then(res => res.data),
    enabled: !!user,
  });

  // Demander les permissions
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && audioStatus === 'granted');

      if (includeLocation) {
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        if (locationStatus === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
        }
      }
    })();
  }, [includeLocation]);

  // Préparer la caméra
  useEffect(() => {
    if (hasPermission && cameraRef.current && currentStep === 2) {
      setTimeout(() => setCameraReady(true), 500);
    }
  }, [hasPermission, currentStep]);

  // Mutation pour créer le live
  const createLiveMutation = useMutation({
    mutationFn: (data: any) => api.post('/live', data),
    onSuccess: (response) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: isScheduled ? 'Live programmé !' : 'Live créé avec succès !',
        text2: isScheduled ? `Début le ${scheduledDate.toLocaleString()}` : 'Bonne diffusion !',
      });
      
      if (!isScheduled) {
        navigation.navigate('LiveStream' as never, {
          streamId: response.data.id,
          cameraReady: true,
          selectedFilter: selectedFilter.id !== 'none' ? selectedFilter : null,
          isMuted,
          flashMode,
        } as never);
      } else {
        navigation.navigate('LiveStreams' as never);
      }
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.response?.data?.error || 'Erreur lors de la création du live',
      });
    },
  });

  // Gérer la création
  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    if (isPremium && (!price || parseFloat(price) <= 0)) {
      Alert.alert('Erreur', 'Veuillez définir un prix valide');
      return;
    }

    if (isScheduled && scheduledDate < new Date()) {
      Alert.alert('Erreur', 'La date de programmation doit être dans le futur');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload de la miniature si présente
      let thumbnailUrl = null;
      if (thumbnail) {
        const formData = new FormData();
        formData.append('image', {
          uri: thumbnail,
          type: 'image/jpeg',
          name: 'thumbnail.jpg',
        } as any);
        const uploadRes = await api.post('/upload', formData);
        thumbnailUrl = uploadRes.data.url;
      }

      createLiveMutation.mutate({
        title: title.trim(),
        description: description.trim(),
        is_premium: isPremium,
        price: isPremium ? parseFloat(price) : 0,
        channel_id: selectedChannel?.id,
        scheduled_for: isScheduled ? scheduledDate.toISOString() : null,
        tags: tags.length > 0 ? tags : null,
        thumbnail: thumbnailUrl,
        location: includeLocation && location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        } : null,
        settings: {
          filter: selectedFilter.id !== 'none' ? selectedFilter.id : null,
          camera_type: cameraType,
        },
      });
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Erreur', 'Erreur lors de la préparation du live');
    }
  };

  // Ajouter un tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Supprimer un tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Choisir une miniature
  const pickThumbnail = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setThumbnail(result.assets[0].uri);
    }
  };

  // Prendre une photo avec la caméra
  const takeThumbnailPhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setThumbnail(photo.uri);
    }
  };

  // Changer de filtre
  const applyFilter = (filter: VideoFilter) => {
    setSelectedFilter(filter);
    setShowFilterModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Rendu du header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <X size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {isScheduled ? 'Programmer un live' : 'Démarrer un live'}
      </Text>
      <View style={styles.headerRight}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]} />
          <View style={[styles.stepDot, currentStep >= 3 && styles.stepDotActive]} />
        </View>
      </View>
    </View>
  );

  // Rendu de l'étape 1 : Informations
  const renderStep1 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Miniature */}
      <TouchableOpacity style={styles.thumbnailContainer} onPress={pickThumbnail}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <ImageIcon size={32} color="#999" />
            <Text style={styles.thumbnailText}>Ajouter une miniature</Text>
            <Text style={styles.thumbnailSubtext}>16:9 recommandé</Text>
          </View>
        )}
        {cameraReady && (
          <TouchableOpacity style={styles.takePhotoButton} onPress={takeThumbnailPhoto}>
            <CameraIcon size={16} color="#FFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Titre */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Titre du live <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Manifestation pacifique à Kinshasa"
          placeholderTextColor="#999"
          maxLength={100}
        />
        <Text style={styles.charCount}>{title.length}/100</Text>
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez ce que vous allez diffuser..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>

      {/* Chaîne */}
      {channels?.length > 0 && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Chaîne</Text>
          <TouchableOpacity style={styles.channelSelector}>
            <Text style={styles.channelSelectorText}>
              {selectedChannel?.channel_name || channels[0]?.channel_name || 'Sélectionner une chaîne'}
            </Text>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tags */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tags (max 10)</Text>
        <View style={styles.tagInputContainer}>
          {tags.map((tag, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tag}
              onPress={() => removeTag(tag)}
            >
              <Text style={styles.tagText}>#{tag}</Text>
              <X size={12} color="#666" />
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder={tags.length < 10 ? "Ajouter un tag..." : "Max 10 tags"}
            placeholderTextColor="#999"
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Localisation */}
      <View style={styles.switchContainer}>
        <View style={styles.switchLabel}>
          <MapPin size={20} color="#666" />
          <Text style={styles.switchText}>Inclure la localisation</Text>
        </View>
        <Switch
          value={includeLocation}
          onValueChange={setIncludeLocation}
          trackColor={{ false: '#DDD', true: '#EF4444' }}
        />
      </View>

      {/* Section Premium */}
      <View style={styles.premiumSection}>
        <View style={styles.premiumHeader}>
          <View style={styles.premiumTitleContainer}>
            <Lock color={isPremium ? '#F59E0B' : '#666'} size={24} />
            <View>
              <Text style={[styles.premiumTitle, isPremium && styles.premiumTitleActive]}>
                Stream Premium
              </Text>
              <Text style={styles.premiumSubtitle}>
                Faites payer l'accès à votre stream
              </Text>
            </View>
          </View>
          <Switch
            value={isPremium}
            onValueChange={setIsPremium}
            trackColor={{ false: '#DDD', true: '#F59E0B' }}
          />
        </View>

        {isPremium && (
          <View style={styles.priceContainer}>
            <DollarSign size={20} color="#666" />
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              placeholder="Prix"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
            <Text style={styles.priceCurrency}>USD</Text>
          </View>
        )}

        <View style={styles.revenueInfo}>
          <Info size={14} color="#666" />
          <Text style={styles.revenueText}>
            Vous recevrez 80% des revenus générés
          </Text>
        </View>
      </View>

      {/* Planification */}
      <TouchableOpacity
        style={styles.scheduleButton}
        onPress={() => setIsScheduled(!isScheduled)}
      >
        <Calendar size={20} color={isScheduled ? '#EF4444' : '#666'} />
        <Text style={[styles.scheduleText, isScheduled && styles.scheduleTextActive]}>
          Programmer pour plus tard
        </Text>
        <Switch
          value={isScheduled}
          onValueChange={setIsScheduled}
          trackColor={{ false: '#DDD', true: '#EF4444' }}
        />
      </TouchableOpacity>

      {/* Navigation */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentStep(2)}
        >
          <Text style={styles.nextButtonText}>Continuer</Text>
          <ChevronRight size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Rendu de l'étape 2 : Caméra
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      {/* Prévisualisation caméra */}
      <View style={styles.cameraPreviewContainer}>
        {hasPermission && (
          <Camera
            ref={cameraRef}
            style={styles.cameraPreview}
            type={cameraType}
            flashMode={flashMode}
          >
            {/* Overlay de filtre */}
            {selectedFilter.id !== 'none' && (
              <View style={[styles.filterOverlay, { opacity: 0.3 }]}>
                <Text style={styles.filterName}>{selectedFilter.name}</Text>
              </View>
            )}

            {/* Badge LIVE simulé */}
            <View style={styles.previewLiveBadge}>
              <View style={styles.previewLiveDot} />
              <Text style={styles.previewLiveText}>APERÇU</Text>
            </View>

            {/* Contrôles de caméra */}
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cameraControl}
                onPress={() => setFlashMode(flashMode === 'off' ? 'on' : 'off')}
              >
                <Text style={styles.cameraControlText}>
                  {flashMode === 'on' ? '🔦 ON' : '🔦 OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraControl}
                onPress={() => setCameraType(cameraType === 'back' ? 'front' : 'back')}
              >
                <Text style={styles.cameraControlText}>🔄</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cameraControl, isMuted && styles.cameraControlActive]}
                onPress={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff size={20} color="#FFF" /> : <Mic size={20} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </Camera>
        )}
      </View>

      {/* Sélection de filtre */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>Filtres et effets</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterList}>
          {VIDEO_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterItem,
                selectedFilter.id === filter.id && styles.filterItemActive,
              ]}
              onPress={() => applyFilter(filter)}
            >
              <View style={styles.filterPreview}>
                <Text style={styles.filterEmoji}>{filter.preview || '🎥'}</Text>
              </View>
              <Text style={styles.filterItemText}>{filter.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Conseils */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>💡 Conseils pour un bon live</Text>
        <Text style={styles.tip}>• Assurez-vous d'avoir une bonne connexion</Text>
        <Text style={styles.tip}>• Placez-vous dans un endroit bien éclairé</Text>
        <Text style={styles.tip}>• Utilisez un trépied pour plus de stabilité</Text>
      </View>

      {/* Navigation */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backStepButton}
          onPress={() => setCurrentStep(1)}
        >
          <Text style={styles.backStepButtonText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentStep(isScheduled ? 3 : 3)}
        >
          <Text style={styles.nextButtonText}>Continuer</Text>
          <ChevronRight size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Rendu de l'étape 3 : Planification ou Récapitulatif
  const renderStep3 = () => (
    <ScrollView style={styles.stepContent}>
      {isScheduled ? (
        <>
          <View style={styles.scheduleSection}>
            <Calendar size={48} color="#EF4444" />
            <Text style={styles.scheduleTitle}>Programmer votre live</Text>
            <Text style={styles.scheduleSubtitle}>
              Votre live sera automatiquement lancé à la date choisie
            </Text>

            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color="#666" />
              <Text style={styles.datePickerText}>
                {scheduledDate.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={20} color="#666" />
              <Text style={styles.datePickerText}>
                {scheduledDate.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={scheduledDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setScheduledDate(date);
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={scheduledDate}
                mode="time"
                display="spinner"
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) setScheduledDate(date);
                }}
              />
            )}
          </View>

          <View style={styles.reminderSection}>
            <Info size={20} color="#F59E0B" />
            <Text style={styles.reminderText}>
              Vous recevrez une notification 15 minutes avant le début du live
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Récapitulatif</Text>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Titre</Text>
            <Text style={styles.summaryValue}>{title}</Text>
          </View>
          
          {description && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Description</Text>
              <Text style={styles.summaryValue}>{description}</Text>
            </View>
          )}
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Type</Text>
            <Text style={styles.summaryValue}>
              {isPremium ? `Premium - ${price} USD` : 'Gratuit'}
            </Text>
          </View>
          
          {tags.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tags</Text>
              <View style={styles.summaryTags}>
                {tags.map((tag, i) => (
                  <Text key={i} style={styles.summaryTag}>#{tag}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Bouton de création */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backStepButton}
          onPress={() => setCurrentStep(2)}
        >
          <Text style={styles.backStepButtonText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createButton, (!title.trim() || isSubmitting) && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!title.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Video size={20} color="#FFF" />
              <Text style={styles.createButtonText}>
                {isScheduled ? 'Programmer le live' : 'Démarrer le live'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Rendu principal
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderHeader()}
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
  },
  stepDotActive: {
    backgroundColor: '#EF4444',
    width: 16,
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  thumbnailContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  thumbnailSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  takePhotoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
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
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  channelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  channelSelectorText: {
    fontSize: 16,
    color: '#1F2937',
  },
  tagInputContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    gap: 4,
  },
  tagText: {
    fontSize: 14,
    color: '#1F2937',
  },
  tagInput: {
    flex: 1,
    minWidth: 100,
    padding: 8,
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    fontSize: 16,
    color: '#1F2937',
  },
  premiumSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  premiumTitleActive: {
    color: '#F59E0B',
  },
  premiumSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    padding: 8,
  },
  priceCurrency: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  revenueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revenueText: {
    fontSize: 12,
    color: '#666',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  scheduleText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  scheduleTextActive: {
    color: '#EF4444',
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  backStepButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  backStepButtonText: {
    fontSize: 16,
    color: '#666',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cameraPreviewContainer: {
    width: '100%',
    height: width * 1.2,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cameraPreview: {
    flex: 1,
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewLiveBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  previewLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  previewLiveText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  cameraControl: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraControlActive: {
    backgroundColor: '#EF4444',
  },
  cameraControlText: {
    color: '#FFF',
    fontSize: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  filterList: {
    flexDirection: 'row',
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
  },
  filterItemActive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  filterPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterEmoji: {
    fontSize: 24,
  },
  filterItemText: {
    fontSize: 12,
    color: '#666',
  },
  tipsContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  tip: {
    fontSize: 13,
    color: '#1E40AF',
    marginBottom: 4,
  },
  scheduleSection: {
    alignItems: 'center',
    padding: 24,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2937',
  },
  reminderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  reminderText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  summarySection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  summaryItem: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  summaryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  summaryTag: {
    fontSize: 14,
    color: '#EF4444',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});