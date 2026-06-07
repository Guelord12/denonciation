import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Camera } from 'lucide-react-native';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  nationality: string;
}

export default function EditProfileScreen({ navigation }: any) {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    country: user?.country || '',
    city: user?.city || '',
    nationality: user?.nationality || '',
  });

  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch('/users/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      Toast.show({
        type: 'success',
        text1: 'Profil mis à jour',
        text2: 'Vos modifications ont été enregistrées',
      });
      setTimeout(() => navigation.goBack(), 1500);
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.response?.data?.message || 'Impossible de mettre à jour le profil',
      });
    },
  });

  // Upload Avatar Mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formDataUpload = new FormData();
      const imageName = imageUri.split('/').pop() || 'avatar.jpg';
      formDataUpload.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: imageName,
      } as any);
      const response = await api.post('/users/avatar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.url;
    },
    onSuccess: (url) => {
      setAvatar(url);
      setUser({ ...user, avatar: url });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de télécharger l\'image',
      });
    },
  });

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        uploadAvatarMutation.mutate(result.assets[0].uri);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de sélectionner l\'image',
      });
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.username.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      Alert.alert('Erreur', 'Email invalide');
      return;
    }

    setIsLoading(true);
    updateProfileMutation.mutate(formData);
    setIsLoading(false);
  };

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {formData.first_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={pickImage}
              disabled={uploadAvatarMutation.isPending}
            >
              {uploadAvatarMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Camera size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          {/* First Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Prénom *</Text>
            <TextInput
              style={styles.input}
              value={formData.first_name}
              onChangeText={(value) => handleChange('first_name', value)}
              placeholder="Votre prénom"
              placeholderTextColor="#999"
            />
          </View>

          {/* Last Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              value={formData.last_name}
              onChangeText={(value) => handleChange('last_name', value)}
              placeholder="Votre nom"
              placeholderTextColor="#999"
            />
          </View>

          {/* Username */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nom d'utilisateur *</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(value) => handleChange('username', value)}
              placeholder="Nom d'utilisateur unique"
              placeholderTextColor="#999"
              editable={false}
              selectTextOnFocus={false}
            />
            <Text style={styles.hint}>Le nom d'utilisateur ne peut pas être changé</Text>
          </View>

          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              placeholder="votre.email@example.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              editable={false}
              selectTextOnFocus={false}
            />
            <Text style={styles.hint}>L'email ne peut pas être changé</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de contact</Text>

          {/* Phone */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              placeholder="+243 ..."
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localisation</Text>

          {/* Country */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Pays</Text>
            <TextInput
              style={styles.input}
              value={formData.country}
              onChangeText={(value) => handleChange('country', value)}
              placeholder="République Démocratique du Congo"
              placeholderTextColor="#999"
            />
          </View>

          {/* City */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ville</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(value) => handleChange('city', value)}
              placeholder="Kinshasa"
              placeholderTextColor="#999"
            />
          </View>

          {/* Nationality */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nationalité</Text>
            <TextInput
              style={styles.input}
              value={formData.nationality}
              onChangeText={(value) => handleChange('nationality', value)}
              placeholder="Congolaise"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading || updateProfileMutation.isPending}
        >
          {isLoading || updateProfileMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 16,
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
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  genderOptionActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  genderText: {
    fontSize: 14,
    color: '#666',
  },
  genderTextActive: {
    color: '#FFF',
    fontWeight: '500',
  },
});