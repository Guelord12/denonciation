import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search,
  Ban,
  CheckCircle,
  MessageSquare,
  Eye,
  Mail,
  Phone,
  Calendar,
  Filter,
  Download,
  UserCheck,
  AlertTriangle,
  X,
  MapPin,
  Globe,
  User,
  Cake,
  VenusAndMars,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterBanned, setFilterBanned] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [banReason, setBanReason] = useState('');

  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, filterBanned],
    queryFn: () => adminAPI.getUsers({
      page,
      limit: 20,
      search,
      banned: filterBanned || undefined,
    }).then(res => res.data),
    placeholderData: (prev) => prev,
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      adminAPI.banUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Utilisateur banni avec succès');
      setShowWarningModal(false);
      setBanReason('');
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors du bannissement');
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: number) => adminAPI.unbanUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Utilisateur débanni avec succès');
    },
  });

  const sendWarningMutation = useMutation({
    mutationFn: ({ userId, message }: { userId: number; message: string }) =>
      adminAPI.sendWarning(userId, message),
    onSuccess: () => {
      setShowWarningModal(false);
      setWarningMessage('');
      setSelectedUser(null);
      toast.success('Avertissement envoyé par SMS');
    },
  });

  const handleBan = () => {
    if (selectedUser && banReason) {
      banMutation.mutate({ userId: selectedUser.id, reason: banReason });
    }
  };

  const handleSendWarning = () => {
    if (selectedUser && warningMessage) {
      sendWarningMutation.mutate({
        userId: selectedUser.id,
        message: warningMessage,
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminAPI.exportData('users');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString()}.csv`;
      a.click();
      toast.success('Export réussi');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Non renseignée';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Non renseignée';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterBanned}
              onChange={(e) => setFilterBanned(e.target.value)}
              className="input-field w-40"
            >
              <option value="">Tous les statuts</option>
              <option value="false">Actifs</option>
              <option value="true">Bannis</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statistiques
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    </div>
                  </td>
                </tr>
              ) : usersData?.users?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                usersData?.users?.map((user: any) => (
                  <tr key={user.id} className={user.is_banned ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full"
                            src={
                              user.avatar ||
                              `https://ui-avatars.com/api/?name=${user.username}&background=EF4444&color=fff`
                            }
                            alt=""
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="w-4 h-4 mr-1 text-gray-400" />
                        {user.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Phone className="w-4 h-4 mr-1 text-gray-400" />
                        {user.phone || 'Non renseigné'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-medium">{user.reports_count || 0}</span>{' '}
                        signalements
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">{user.comments_count || 0}</span>{' '}
                        commentaires
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_banned ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Banni
                        </span>
                      ) : user.is_admin ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {user.created_at ? formatDate(user.created_at) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir détails"
                        >
                          <Eye className="w-5 h-5" />
                        </button>

                        {!user.is_admin && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowWarningModal(true);
                              }}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Envoyer un avertissement"
                            >
                              <MessageSquare className="w-5 h-5" />
                            </button>

                            {user.is_banned ? (
                              <button
                                onClick={() => unbanMutation.mutate(user.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Débannir"
                              >
                                <UserCheck className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBanReason('');
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Bannir"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {usersData?.pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Affichage de{' '}
            <span className="font-medium">{(page - 1) * 20 + 1}</span> à{' '}
            <span className="font-medium">
              {Math.min(page * 20, usersData.pagination.total)}
            </span>{' '}
            sur <span className="font-medium">{usersData.pagination.total}</span> résultats
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="px-3 py-1">
              Page {page} sur {usersData.pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(usersData.pagination.pages, p + 1))}
              disabled={page >= usersData.pagination.pages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mr-2" />
              <h3 className="text-lg font-semibold">
                Envoyer un avertissement à {selectedUser.username}
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              L'utilisateur recevra un SMS avec votre message.
              {selectedUser.phone ? (
                <span className="block mt-1 text-green-600">
                  Numéro : {selectedUser.phone}
                </span>
              ) : (
                <span className="block mt-1 text-red-600">
                  Attention : Aucun numéro de téléphone enregistré
                </span>
              )}
            </p>

            <textarea
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              placeholder="Message d'avertissement..."
              className="input-field w-full mb-4"
              rows={4}
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  setSelectedUser(null);
                  setWarningMessage('');
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleSendWarning}
                disabled={!warningMessage || sendWarningMutation.isPending}
                className="btn-primary bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50"
              >
                {sendWarningMutation.isPending ? 'Envoi...' : 'Envoyer SMS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {selectedUser && banReason !== undefined && !showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <Ban className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold">
                Bannir {selectedUser.username}
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Cette action empêchera l'utilisateur d'accéder à la plateforme.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Raison du bannissement *
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Raison du bannissement..."
                className="input-field w-full"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setBanReason('');
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason || banMutation.isPending}
                className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {banMutation.isPending ? 'Bannissement...' : 'Confirmer le bannissement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal - AVEC TOUTES LES INFORMATIONS */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Détails de l'utilisateur</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center mb-6">
              <img
                src={
                  selectedUser.avatar ||
                  `https://ui-avatars.com/api/?name=${selectedUser.username}&size=64&background=EF4444&color=fff`
                }
                alt=""
                className="w-16 h-16 rounded-full mr-4"
              />
              <div>
                <h4 className="text-lg font-semibold">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h4>
                <p className="text-gray-600">@{selectedUser.username}</p>
                <span
                  className={`mt-1 px-2 py-0.5 text-xs rounded-full inline-block ${
                    selectedUser.is_banned
                      ? 'bg-red-100 text-red-800'
                      : selectedUser.is_admin
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {selectedUser.is_banned
                    ? 'Banni'
                    : selectedUser.is_admin
                    ? 'Administrateur'
                    : 'Actif'}
                </span>
              </div>
            </div>

            {/* ✅ Informations personnelles complètes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="font-medium">{selectedUser.phone || 'Non renseigné'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Pays</p>
                  <p className="font-medium">{selectedUser.country || 'Non renseigné'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Ville</p>
                  <p className="font-medium">{selectedUser.city || 'Non renseignée'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Globe className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Nationalité</p>
                  <p className="font-medium">{selectedUser.nationality || 'Non renseignée'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Cake className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Date de naissance</p>
                  <p className="font-medium">{formatDate(selectedUser.birth_date)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <VenusAndMars className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Genre</p>
                  <p className="font-medium">{selectedUser.gender || 'Non renseigné'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Inscription</p>
                  <p className="font-medium">{formatDateTime(selectedUser.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Dernière mise à jour</p>
                  <p className="font-medium">{formatDateTime(selectedUser.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Statistiques */}
            <div className="border-t pt-4">
              <h5 className="font-semibold mb-3">Statistiques</h5>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold">{selectedUser.reports_count || 0}</p>
                  <p className="text-xs text-gray-600">Signalements</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold">{selectedUser.comments_count || 0}</p>
                  <p className="text-xs text-gray-600">Commentaires</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-gray-600">Likes</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-gray-600">Streams</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedUser(null);
                }}
                className="btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}