import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Database,
  Mail,
  Save,
  RefreshCw,
  Trash2,
  Loader2,
} from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    siteName: 'Dénonce',
    siteDescription: "Plateforme de signalement d'abus",
    contactEmail: 'contact@denonciation.com',
    moderationAutoApprove: false,
    userRegistrationEnabled: true,
    commentsEnabled: true,
    maxReportPerDay: 10,
    maxCommentLength: 1000,
    smsProvider: 'twilio',
    emailProvider: 'smtp',
  });

  const [activeTab, setActiveTab] = useState('general');

  // Charger les paramètres existants
  const { isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminAPI.updateSettings({}).catch(() => {
      // Fallback localStorage
      const saved = localStorage.getItem('adminSettings');
      if (saved) setSettings(JSON.parse(saved));
      return { data: {} };
    }),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => adminAPI.updateSettings(data).catch((err) => {
      // Fallback localStorage si API indisponible
      localStorage.setItem('adminSettings', JSON.stringify(data));
      return { data: { message: 'Sauvegardé localement' } };
    }),
    onSuccess: (response: any) => {
      const msg = response?.data?.message || 'Paramètres enregistrés avec succès';
      toast.success(msg);
      localStorage.setItem('adminSettings', JSON.stringify(settings));
    },
    onError: (error: any) => {
      // Sauvegarde locale en fallback
      localStorage.setItem('adminSettings', JSON.stringify(settings));
      toast.success('Paramètres enregistrés localement (API indisponible)');
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleClearCache = async () => {
    try {
      await adminAPI.clearCache();
      toast.success('Cache vidé avec succès');
    } catch (error) {
      toast.error('Erreur lors du vidage du cache');
    }
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: SettingsIcon },
    { id: 'moderation', label: 'Modération', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'database', label: 'Base de données', icon: Database },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium flex items-center space-x-2 whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Paramètres généraux</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom du site</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={settings.siteDescription}
                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    className="input-field w-full"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email de contact</label>
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <ToggleOption
                  label="Inscriptions ouvertes"
                  description="Autoriser les nouveaux utilisateurs à s'inscrire"
                  enabled={settings.userRegistrationEnabled}
                  onChange={(val) => setSettings({ ...settings, userRegistrationEnabled: val })}
                />
                <ToggleOption
                  label="Commentaires activés"
                  description="Autoriser les commentaires sur les signalements"
                  enabled={settings.commentsEnabled}
                  onChange={(val) => setSettings({ ...settings, commentsEnabled: val })}
                />
              </div>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Paramètres de modération</h3>
              <div className="space-y-4">
                <ToggleOption
                  label="Approbation automatique"
                  description="Approuver automatiquement les signalements des utilisateurs de confiance"
                  enabled={settings.moderationAutoApprove}
                  onChange={(val) => setSettings({ ...settings, moderationAutoApprove: val })}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">Signalements max par jour</label>
                  <input
                    type="number"
                    value={settings.maxReportPerDay}
                    onChange={(e) => setSettings({ ...settings, maxReportPerDay: parseInt(e.target.value) || 10 })}
                    className="input-field w-32"
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longueur max des commentaires</label>
                  <input
                    type="number"
                    value={settings.maxCommentLength}
                    onChange={(e) => setSettings({ ...settings, maxCommentLength: parseInt(e.target.value) || 1000 })}
                    className="input-field w-32"
                    min={100}
                    max={5000}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Paramètres de notification</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Fournisseur SMS</label>
                <select
                  value={settings.smsProvider}
                  onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
                  className="input-field w-64"
                >
                  <option value="twilio">Twilio</option>
                  <option value="africastalking">Africa's Talking</option>
                  <option value="none">Désactivé</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Paramètres email</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Fournisseur</label>
                <select
                  value={settings.emailProvider}
                  onChange={(e) => setSettings({ ...settings, emailProvider: e.target.value })}
                  className="input-field w-64"
                >
                  <option value="smtp">SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                  <option value="none">Désactivé</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Maintenance</h3>
              <div className="space-y-4">
                <button onClick={handleClearCache} className="btn-secondary flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>Vider le cache</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="btn-primary flex items-center space-x-2"
          >
            {saveSettingsMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveSettingsMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant Toggle réutilisable
function ToggleOption({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
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