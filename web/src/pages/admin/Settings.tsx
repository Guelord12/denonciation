import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
} from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    siteName: 'Dénonciation',
    siteDescription: 'Plateforme de signalement d\'abus',
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

  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => adminAPI.updateSettings(data),
    onSuccess: () => {
      toast.success('Paramètres enregistrés avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium flex items-center space-x-2 ${
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
                  <label className="block text-sm font-medium mb-1">
                    Nom du site
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={settings.siteDescription}
                    onChange={(e) =>
                      setSettings({ ...settings, siteDescription: e.target.value })
                    }
                    className="input-field"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, contactEmail: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Inscriptions ouvertes</p>
                    <p className="text-sm text-gray-500">
                      Autoriser les nouveaux utilisateurs à s'inscrire
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.userRegistrationEnabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          userRegistrationEnabled: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Paramètres de modération</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Approbation automatique</p>
                    <p className="text-sm text-gray-500">
                      Approuver automatiquement les signalements des utilisateurs de confiance
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.moderationAutoApprove}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          moderationAutoApprove: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nombre maximum de signalements par jour
                  </label>
                  <input
                    type="number"
                    value={settings.maxReportPerDay}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxReportPerDay: parseInt(e.target.value),
                      })
                    }
                    className="input-field w-32"
                    min={1}
                    max={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Longueur maximale des commentaires
                  </label>
                  <input
                    type="number"
                    value={settings.maxCommentLength}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxCommentLength: parseInt(e.target.value),
                      })
                    }
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fournisseur SMS
                  </label>
                  <select
                    value={settings.smsProvider}
                    onChange={(e) =>
                      setSettings({ ...settings, smsProvider: e.target.value })
                    }
                    className="input-field w-64"
                  >
                    <option value="twilio">Twilio</option>
                    <option value="africastalking">Africa's Talking</option>
                    <option value="none">Désactivé</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Paramètres email</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fournisseur
                  </label>
                  <select
                    value={settings.emailProvider}
                    onChange={(e) =>
                      setSettings({ ...settings, emailProvider: e.target.value })
                    }
                    className="input-field w-64"
                  >
                    <option value="smtp">SMTP</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="mailgun">Mailgun</option>
                    <option value="none">Désactivé</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Maintenance de la base de données</h3>

              <div className="space-y-4">
                <button
                  onClick={handleClearCache}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Vider le cache Redis</span>
                </button>

                <button
                  className="btn-secondary bg-red-100 text-red-700 hover:bg-red-200 flex items-center space-x-2"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir nettoyer les anciens logs ?')) {
                      // Implement cleanup
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Nettoyer les anciens logs</span>
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
            <Save className="w-4 h-4" />
            <span>
              {saveSettingsMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}