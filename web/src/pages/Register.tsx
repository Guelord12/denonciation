import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../stores/authStore';
import { Eye, EyeOff, User, Mail, Lock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput from '../components/common/PhoneInput';
import CountrySelect from '../components/common/CountrySelect';
import NationalitySelect from '../components/common/NationalitySelect';

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name?: string;
  last_name?: string;
  phoneNumber?: string;
  phoneCode?: string;
  country?: string;
  city?: string;
  nationality?: string;
  birth_date?: string;
  gender?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    setIsLoading(true);
    try {
      // Nettoyer et formater les données
      const formattedData = {
        username: data.username,
        email: data.email,
        password: data.password,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        phone: data.phoneCode && data.phoneNumber 
          ? `+${data.phoneCode}${data.phoneNumber.replace(/\s+/g, '')}` 
          : undefined,
        country: data.country || undefined,
        city: data.city || undefined,
        nationality: data.nationality || undefined,
        birth_date: data.birth_date ? new Date(data.birth_date).toISOString() : undefined,
        gender: data.gender || undefined,
      };
      
      console.log('📤 Sending register data:', formattedData);
      
      await registerUser(formattedData);
      toast.success('Inscription réussie !');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('❌ Register error:', error.response?.data);
      toast.error(error.response?.data?.error || 'Erreur d\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Inscription</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nom d'utilisateur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'utilisateur *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                {...register('username', { 
                  required: 'Ce champ est requis',
                  minLength: { value: 3, message: 'Minimum 3 caractères' },
                  maxLength: { value: 50, message: 'Maximum 50 caractères' },
                  pattern: { value: /^[a-zA-Z0-9_-]+$/, message: 'Lettres, chiffres, _, - uniquement' }
                })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="johndoe"
                autoComplete="username"
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          {/* Prénom et Nom */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                {...register('first_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="John"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                {...register('last_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Doe"
                autoComplete="family-name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                {...register('email', { 
                  required: 'Ce champ est requis',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' }
                })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="john.doe@example.com"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Téléphone avec indicatif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <Controller
              name="phoneNumber"
              control={control}
              render={({ field }) => (
                <Controller
                  name="phoneCode"
                  control={control}
                  defaultValue="243"
                  render={({ field: codeField }) => (
                    <PhoneInput
                      value={field.value || ''}
                      onChange={(number, code) => {
                        field.onChange(number);
                        codeField.onChange(code);
                      }}
                      placeholder="Numéro de téléphone"
                    />
                  )}
                />
              )}
            />
          </div>

          {/* Pays */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pays
            </label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <CountrySelect
                  value={field.value || ''}
                  onChange={(country) => field.onChange(country?.name || '')}
                  placeholder="Sélectionner un pays"
                />
              )}
            />
          </div>

          {/* Ville */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ville
            </label>
            <input
              type="text"
              {...register('city')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Votre ville"
              autoComplete="address-level2"
            />
          </div>

          {/* Nationalité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nationalité
            </label>
            <Controller
              name="nationality"
              control={control}
              render={({ field }) => (
                <NationalitySelect
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Sélectionner une nationalité"
                />
              )}
            />
          </div>

          {/* Date de naissance et Genre */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de naissance
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  {...register('birth_date')}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="bday"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genre
              </label>
              <select 
                {...register('gender')} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                autoComplete="sex"
              >
                <option value="">Non spécifié</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', { 
                  required: 'Ce champ est requis',
                  minLength: { value: 8, message: 'Minimum 8 caractères' },
                  pattern: { 
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
                    message: 'Doit contenir majuscule, minuscule et chiffre' 
                  }
                })}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirmation mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword', { 
                  required: 'Ce champ est requis',
                  validate: value => value === password || 'Les mots de passe ne correspondent pas'
                })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Conditions d'utilisation */}
          <div className="flex items-center">
            <input type="checkbox" required className="rounded border-gray-300 text-red-600" />
            <span className="ml-2 text-sm text-gray-600">
              J'accepte les{' '}
              <Link to="/terms" className="text-red-600 hover:underline">
                conditions d'utilisation
              </Link>
            </span>
          </div>

          {/* Bouton d'inscription */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
          >
            {isLoading ? 'Inscription...' : 'S\'inscrire'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-red-600 hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}