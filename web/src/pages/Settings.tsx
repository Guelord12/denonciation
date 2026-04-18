import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { userAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { User, Lock, Bell, Shield, Moon, Globe, Trash2, Save, AlertTriangle } from 'lucide-react';

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

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword, watch, formState: { errors: passwordErrors } } = useForm<PasswordFormData>();
  const newPassword = watch('newPassword');

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => userAPI.changePassword(data.currentPassword, data.newPassword),
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
        <div className="flex border-b">
          <div className="w-64 border-r">
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <tab.icon className="w-5 h-5" /><span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1 p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Informations du profil</h3>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Nom d'utilisateur</label><input type="text" value={user?.username} disabled className="input-field bg-gray-50" /><p className="text-xs text-gray-500 mt-1">Le nom d'utilisateur ne peut pas être modifié</p></div>
                  <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={user?.email} disabled className="input-field bg-gray-50" /></div>
                  <div><label className="block text-sm font-medium mb-1">Téléphone</label><input type="tel" defaultValue={user?.phone} className="input-field" placeholder="+243 XXX XXX XXX" /></div>
                </div>
                <div className="flex justify-end"><button className="btn-primary flex items-center space-x-2"><Save className="w-4 h-4" /><span>Enregistrer</span></button></div>
              </div>
            )}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Changer le mot de passe</h3>
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Mot de passe actuel</label><input type="password" {...registerPassword('currentPassword', { required: 'Le mot de passe actuel est requis' })} className="input-field" />{passwordErrors.currentPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword.message}</p>}</div>
                  <div><label className="block text-sm font-medium mb-1">Nouveau mot de passe</label><input type="password" {...registerPassword('newPassword', { required: 'Le nouveau mot de passe est requis', minLength: { value: 8, message: 'Minimum 8 caractères' }, pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Doit contenir majuscule, minuscule et chiffre' } })} className="input-field" />{passwordErrors.newPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword.message}</p>}</div>
                  <div><label className="block text-sm font-medium mb-1">Confirmer le mot de passe</label><input type="password" {...registerPassword('confirmPassword', { required: 'La confirmation est requise', validate: (value) => value === newPassword || 'Les mots de passe ne correspondent pas' })} className="input-field" />{passwordErrors.confirmPassword && <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword.message}</p>}</div>
                  <div className="flex justify-end"><button type="submit" disabled={changePasswordMutation.isPending} className="btn-primary">{changePasswordMutation.isPending ? 'Modification...' : 'Changer le mot de passe'}</button></div>
                </form>
                <hr className="my-6" />
                <div><h4 className="font-medium mb-2">Authentification à deux facteurs</h4><p className="text-sm text-gray-600 mb-4">Ajoutez une couche de sécurité supplémentaire à votre compte</p><button className="btn-secondary">Configurer 2FA</button></div>
                <hr className="my-6" />
                <div><h4 className="font-medium mb-2">Sessions actives</h4><div className="space-y-3"><div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><p className="font-medium">Session actuelle</p><p className="text-sm text-gray-500">{navigator.userAgent.substring(0, 50)}...</p></div><span className="text-green-600 text-sm font-medium">Actif</span></div></div><button className="text-red-600 text-sm hover:underline mt-3">Déconnecter toutes les autres sessions</button></div>
              </div>
            )}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Supprimer votre compte</h3>
                  <p className="text-red-700 mb-4">Cette action est irréversible. Toutes vos données seront définitivement supprimées.</p>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} className="btn-primary bg-red-600 hover:bg-red-700 flex items-center space-x-2"><Trash2 className="w-4 h-4" /><span>Supprimer mon compte</span></button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-red-700">Veuillez entrer votre mot de passe pour confirmer :</p>
                      <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Votre mot de passe" className="input-field" />
                      <div className="flex space-x-3">
                        <button onClick={handleDeleteAccount} disabled={deleteAccountMutation.isPending} className="btn-primary bg-red-600 hover:bg-red-700">{deleteAccountMutation.isPending ? 'Suppression...' : 'Confirmer la suppression'}</button>
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