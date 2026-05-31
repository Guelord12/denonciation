import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { userAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import {
  User, Lock, Bell, Shield, Moon, Globe, Trash2, Save, AlertTriangle,
  Sun, Monitor, Check, Volume2, Mail, MessageCircle, Smartphone,
} from 'lucide-react';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Settings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ✅ États pour les notifications - initialisés depuis localStorage
  const [emailNotif, setEmailNotif] = useState(() => localStorage.getItem('setting_emailNotif') !== 'false');
  const [pushNotif, setPushNotif] = useState(() => localStorage.getItem('setting_pushNotif') !== 'false');
  const [soundNotif, setSoundNotif] = useState(() => localStorage.getItem('setting_soundNotif') !== 'false');
  const [newReportNotif, setNewReportNotif] = useState(() => localStorage.getItem('setting_newReportNotif') !== 'false');
  const [newCommentNotif, setNewCommentNotif] = useState(() => localStorage.getItem('setting_newCommentNotif') !== 'false');
  const [newLikeNotif, setNewLikeNotif] = useState(() => localStorage.getItem('setting_newLikeNotif') !== 'false');
  const [newLiveNotif, setNewLiveNotif] = useState(() => localStorage.getItem('setting_newLiveNotif') !== 'false');
  const [newWitnessNotif, setNewWitnessNotif] = useState(() => localStorage.getItem('setting_newWitnessNotif') !== 'false');
  const [statusNotif, setStatusNotif] = useState(() => localStorage.getItem('setting_statusNotif') !== 'false');
  const [systemNotif, setSystemNotif] = useState(() => localStorage.getItem('setting_systemNotif') !== 'false');

  // ✅ États pour la confidentialité - initialisés depuis localStorage
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private' | 'followers'>(
    () => (localStorage.getItem('setting_profileVisibility') as any) || 'public'
  );
  const [showOnlineStatus, setShowOnlineStatus] = useState(() => localStorage.getItem('setting_showOnlineStatus') !== 'false');
  const [allowMessages, setAllowMessages] = useState(() => localStorage.getItem('setting_allowMessages') !== 'false');
  const [showLocation, setShowLocation] = useState(() => localStorage.getItem('setting_showLocation') === 'true');

  // ✅ États pour l'apparence - initialisés depuis localStorage
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    () => (localStorage.getItem('setting_theme') as any) || 'system'
  );
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(
    () => (localStorage.getItem('setting_fontSize') as any) || 'medium'
  );
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('setting_reducedMotion') === 'true');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('setting_highContrast') === 'true');

  // ✅ État pour la langue - initialisé depuis localStorage
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || localStorage.getItem('setting_language') || 'fr');

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword, watch, formState: { errors: passwordErrors } } = useForm<PasswordFormData>();
  const newPassword = watch('newPassword');

  // ✅ Appliquer le thème et la langue au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('setting_theme') || 'system';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (savedTheme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    const savedLang = localStorage.getItem('language') || localStorage.getItem('setting_language') || 'fr';
    document.documentElement.setAttribute('lang', savedLang);
  }, []);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      userAPI.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => { toast.success('Mot de passe modifié avec succès'); resetPassword(); },
    onError: (error: any) => { toast.error(error.response?.data?.error || 'Erreur lors du changement de mot de passe'); },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => userAPI.deleteAccount(password),
    onSuccess: () => { toast.success('Compte supprimé avec succès'); useAuthStore.getState().logout(); window.location.href = '/'; },
    onError: (error: any) => { toast.error(error.response?.data?.error || 'Erreur lors de la suppression'); },
  });

  const onPasswordSubmit = (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    changePasswordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) { toast.error('Veuillez entrer votre mot de passe'); return; }
    deleteAccountMutation.mutate(deletePassword);
  };

  // ✅ Fonction générique pour sauvegarder un paramètre
  const saveSetting = (key: string, value: any) => {
    localStorage.setItem(key, value.toString());
  };

  // ✅ Sauvegarde des notifications
  const handleSaveNotifications = () => {
    saveSetting('setting_emailNotif', emailNotif);
    saveSetting('setting_pushNotif', pushNotif);
    saveSetting('setting_soundNotif', soundNotif);
    saveSetting('setting_newReportNotif', newReportNotif);
    saveSetting('setting_newCommentNotif', newCommentNotif);
    saveSetting('setting_newLikeNotif', newLikeNotif);
    saveSetting('setting_newLiveNotif', newLiveNotif);
    saveSetting('setting_newWitnessNotif', newWitnessNotif);
    saveSetting('setting_statusNotif', statusNotif);
    saveSetting('setting_systemNotif', systemNotif);
    toast.success('Préférences de notifications enregistrées');
  };

  // ✅ Sauvegarde de la confidentialité
  const handleSavePrivacy = () => {
    saveSetting('setting_profileVisibility', profileVisibility);
    saveSetting('setting_showOnlineStatus', showOnlineStatus);
    saveSetting('setting_allowMessages', allowMessages);
    saveSetting('setting_showLocation', showLocation);
    toast.success('Paramètres de confidentialité enregistrés');
  };

  // ✅ Sauvegarde de l'apparence
  const handleSaveAppearance = () => {
    saveSetting('setting_theme', theme);
    saveSetting('setting_fontSize', fontSize);
    saveSetting('setting_reducedMotion', reducedMotion);
    saveSetting('setting_highContrast', highContrast);

    // Appliquer le thème immédiatement
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    toast.success('Paramètres d\'apparence enregistrés');
  };

  // ✅ Sauvegarde de la langue SANS rechargement (pas de déconnexion)
  const handleSaveLanguage = () => {
    saveSetting('setting_language', language);
    saveSetting('language', language);
    localStorage.setItem('language', language);
    localStorage.setItem('i18n_language', language);
    document.documentElement.setAttribute('lang', language);
    
    // ✅ Appliquer la langue sans recharger la page
    const langName = languages.find(l => l.code === language)?.name || language;
    toast.success(`Langue changée en ${langName}`);
    
    // ✅ Dispatcher un événement personnalisé pour informer les autres composants
    window.dispatchEvent(new CustomEvent('languageChange', { detail: language }));
    
    // ✅ Appliquer la direction RTL si nécessaire (arabe, etc.)
    if (language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  };

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ln', name: 'Lingála', flag: '🇨🇩' },
    { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
  ];

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Sécurité', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Confidentialité', icon: Shield },
    { id: 'appearance', label: 'Apparence', icon: Moon },
    { id: 'language', label: 'Langue', icon: Globe },
    { id: 'danger', label: 'Zone dangereuse', icon: AlertTriangle },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Paramètres</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="flex flex-col md:flex-row border-b">
          {/* Sidebar */}
          <div className="md:w-64 border-r">
            <nav className="p-4 space-y-1 overflow-x-auto md:overflow-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu */}
          <div className="flex-1 p-6">
            {/* ===================================================== */}
            {/* PROFIL */}
            {/* ===================================================== */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Informations du profil</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom d'utilisateur</label>
                    <input type="text" value={user?.username} disabled className="input-field bg-gray-50 w-full" />
                    <p className="text-xs text-gray-500 mt-1">Le nom d'utilisateur ne peut pas être modifié</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={user?.email} disabled className="input-field bg-gray-50 w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <input type="tel" defaultValue={user?.phone} className="input-field w-full" placeholder="+243 XXX XXX XXX" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="btn-primary flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* SÉCURITÉ */}
            {/* ===================================================== */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Changer le mot de passe</h3>
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Mot de passe actuel</label>
                    <input type="password" {...registerPassword('currentPassword', { required: 'Le mot de passe actuel est requis' })} className="input-field w-full" />
                    {passwordErrors.currentPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
                    <input type="password" {...registerPassword('newPassword', {
                      required: 'Le nouveau mot de passe est requis',
                      minLength: { value: 8, message: 'Minimum 8 caractères' },
                      pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Doit contenir majuscule, minuscule et chiffre' }
                    })} className="input-field w-full" />
                    {passwordErrors.newPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Confirmer le mot de passe</label>
                    <input type="password" {...registerPassword('confirmPassword', {
                      required: 'La confirmation est requise',
                      validate: (value) => value === newPassword || 'Les mots de passe ne correspondent pas'
                    })} className="input-field w-full" />
                    {passwordErrors.confirmPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword.message}</p>}
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={changePasswordMutation.isPending} className="btn-primary">
                      {changePasswordMutation.isPending ? 'Modification...' : 'Changer le mot de passe'}
                    </button>
                  </div>
                </form>

                <hr className="my-6" />
                <div>
                  <h4 className="font-medium mb-2">Authentification à deux facteurs</h4>
                  <p className="text-sm text-gray-600 mb-4">Ajoutez une couche de sécurité supplémentaire à votre compte</p>
                  <button className="btn-secondary">Configurer 2FA</button>
                </div>

                <hr className="my-6" />
                <div>
                  <h4 className="font-medium mb-2">Sessions actives</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Session actuelle</p>
                        <p className="text-sm text-gray-500">{navigator.userAgent.substring(0, 50)}...</p>
                      </div>
                      <span className="text-green-600 text-sm font-medium">Actif</span>
                    </div>
                  </div>
                  <button className="text-red-600 text-sm hover:underline mt-3">Déconnecter toutes les autres sessions</button>
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* NOTIFICATIONS */}
            {/* ===================================================== */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Préférences de notifications</h3>
                <p className="text-sm text-gray-600">Gérez comment vous recevez les notifications</p>

                <div className="space-y-4">
                  <h4 className="font-medium">Canaux de notification</h4>
                  <ToggleOption icon={<Mail className="w-5 h-5" />} label="Notifications par email" enabled={emailNotif} onChange={setEmailNotif} />
                  <ToggleOption icon={<Smartphone className="w-5 h-5" />} label="Notifications push" enabled={pushNotif} onChange={setPushNotif} />
                  <ToggleOption icon={<Volume2 className="w-5 h-5" />} label="Sons de notification" enabled={soundNotif} onChange={setSoundNotif} />
                </div>

                <hr className="my-4" />

                <div className="space-y-4">
                  <h4 className="font-medium">Types de notifications</h4>
                  <ToggleOption label="Nouveaux signalements" enabled={newReportNotif} onChange={setNewReportNotif} />
                  <ToggleOption label="Nouveaux commentaires" enabled={newCommentNotif} onChange={setNewCommentNotif} />
                  <ToggleOption label="Nouveaux likes" enabled={newLikeNotif} onChange={setNewLikeNotif} />
                  <ToggleOption label="Nouveaux lives" enabled={newLiveNotif} onChange={setNewLiveNotif} />
                  <ToggleOption label="Nouveaux témoignages" enabled={newWitnessNotif} onChange={setNewWitnessNotif} />
                  <ToggleOption label="Statut des signalements" enabled={statusNotif} onChange={setStatusNotif} />
                  <ToggleOption label="Notifications système" enabled={systemNotif} onChange={setSystemNotif} />
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSaveNotifications} className="btn-primary flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* CONFIDENTIALITÉ */}
            {/* ===================================================== */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Paramètres de confidentialité</h3>
                <p className="text-sm text-gray-600">Contrôlez qui peut voir vos informations</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Visibilité du profil</label>
                    <div className="space-y-2">
                      {[
                        { value: 'public', label: 'Public', desc: 'Votre profil est visible par tout le monde' },
                        { value: 'followers', label: 'Abonnés uniquement', desc: 'Seuls vos abonnés peuvent voir votre profil' },
                        { value: 'private', label: 'Privé', desc: 'Votre profil est complètement privé' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setProfileVisibility(option.value as any)}
                          className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition ${
                            profileVisibility === option.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-left">
                            <p className={`font-medium ${profileVisibility === option.value ? 'text-red-700' : 'text-gray-900'}`}>{option.label}</p>
                            <p className="text-sm text-gray-500">{option.desc}</p>
                          </div>
                          {profileVisibility === option.value && <Check className="w-5 h-5 text-red-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <hr className="my-4" />

                  <div className="space-y-3">
                    <ToggleOption label="Afficher mon statut en ligne" enabled={showOnlineStatus} onChange={setShowOnlineStatus} />
                    <ToggleOption label="Autoriser les messages privés" enabled={allowMessages} onChange={setAllowMessages} />
                    <ToggleOption label="Afficher ma localisation" enabled={showLocation} onChange={setShowLocation} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSavePrivacy} className="btn-primary flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* APPARENCE */}
            {/* ===================================================== */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Paramètres d'apparence</h3>
                <p className="text-sm text-gray-600">Personnalisez l'apparence de l'application</p>

                <div>
                  <label className="block text-sm font-medium mb-3">Thème</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Clair', icon: Sun, desc: 'Thème lumineux' },
                      { value: 'dark', label: 'Sombre', icon: Moon, desc: 'Thème sombre' },
                      { value: 'system', label: 'Système', icon: Monitor, desc: 'Suivre le système' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as any)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
                          theme === option.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <option.icon className={`w-8 h-8 ${theme === option.value ? 'text-red-600' : 'text-gray-500'}`} />
                        <span className={`font-medium ${theme === option.value ? 'text-red-600' : 'text-gray-700'}`}>{option.label}</span>
                        <span className="text-xs text-gray-500">{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Taille de la police</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'small', label: 'Petite', size: 'text-sm' },
                      { value: 'medium', label: 'Moyenne', size: 'text-base' },
                      { value: 'large', label: 'Grande', size: 'text-lg' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFontSize(option.value as any)}
                        className={`flex-1 p-3 rounded-lg border-2 transition ${
                          fontSize === option.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`font-medium ${fontSize === option.value ? 'text-red-600' : 'text-gray-700'}`}>{option.label}</span>
                        <p className={`${option.size} text-gray-500`}>AaBbCc</p>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="my-4" />

                <div className="space-y-3">
                  <ToggleOption label="Réduire les animations" enabled={reducedMotion} onChange={setReducedMotion} />
                  <ToggleOption label="Contraste élevé" enabled={highContrast} onChange={setHighContrast} />
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSaveAppearance} className="btn-primary flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* LANGUE */}
            {/* ===================================================== */}
            {activeTab === 'language' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Langue de l'interface</h3>
                <p className="text-sm text-gray-600">Choisissez la langue d'affichage de la plateforme</p>

                <div className="space-y-3">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition ${
                        language === lang.code ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <span className={`font-medium ${language === lang.code ? 'text-red-700' : 'text-gray-900'}`}>{lang.name}</span>
                      </div>
                      {language === lang.code && <Check className="w-5 h-5 text-red-600" />}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSaveLanguage} className="btn-primary flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            )}

            {/* ===================================================== */}
            {/* ZONE DANGEREUSE */}
            {/* ===================================================== */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Supprimer votre compte</h3>
                  <p className="text-red-700 mb-4">Cette action est irréversible. Toutes vos données seront définitivement supprimées.</p>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} className="btn-primary bg-red-600 hover:bg-red-700 flex items-center space-x-2">
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer mon compte</span>
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-red-700">Veuillez entrer votre mot de passe pour confirmer :</p>
                      <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Votre mot de passe" className="input-field w-full" />
                      <div className="flex space-x-3">
                        <button onClick={handleDeleteAccount} disabled={deleteAccountMutation.isPending} className="btn-primary bg-red-600 hover:bg-red-700">
                          {deleteAccountMutation.isPending ? 'Suppression...' : 'Confirmer la suppression'}
                        </button>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }} className="btn-secondary">Annuler</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// COMPOSANT TOGGLE
// =====================================================

function ToggleOption({
  icon,
  label,
  enabled,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-red-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}