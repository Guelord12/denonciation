import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../../services/api';
import { Search, Ban, CheckCircle, MessageSquare, MoreVertical, Eye } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery(
    ['admin-users', page, search],
    () => adminAPI.getUsers({ page, limit: 20, search })
  );

  const banMutation = useMutation(
    ({ userId, reason }: { userId: number; reason: string }) =>
      adminAPI.banUser(userId, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        toast.success('Utilisateur banni avec succès');
      },
    }
  );

  const unbanMutation = useMutation(
    (userId: number) => adminAPI.unbanUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        toast.success('Utilisateur débanni avec succès');
      },
    }
  );

  const sendWarningMutation = useMutation(
    ({ userId, message }: { userId: number; message: string }) =>
      adminAPI.sendWarning(userId, message),
    {
      onSuccess: () => {
        setShowWarningModal(false);
        setWarningMessage('');
        toast.success('Avertissement envoyé');
      },
    }
  );

  const handleBan = (user: any) => {
    const reason = prompt('Raison du bannissement :');
    if (reason) {
      banMutation.mutate({ userId: user.id, reason });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                </td>
              </tr>
            ) : usersData?.users?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              usersData?.users?.map((user: any) => (
                <tr key={user.id} className={user.is_banned ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="ml-4">
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-gray-500">
                          {user.first_name} {user.last_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{user.email}</p>
                    <p className="text-sm text-gray-500">{user.phone || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_banned ? (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        Banni
                      </span>
                    ) : user.is_admin ? (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
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
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          {user.is_banned ? (
                            <button
                              onClick={() => unbanMutation.mutate(user.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBan(user)}
                              className="text-red-600 hover:text-red-900"
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

      {/* Warning Modal */}
      <Modal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title={`Avertir ${selectedUser?.username}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            L'utilisateur recevra un SMS avec votre message.
          </p>
          <textarea
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            placeholder="Message d'avertissement..."
            className="input-field w-full"
            rows={4}
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowWarningModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => sendWarningMutation.mutate({
                userId: selectedUser?.id,
                message: warningMessage,
              })}
              loading={sendWarningMutation.isLoading}
            >
              Envoyer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Détails de l'utilisateur"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <img
                src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.username}`}
                alt=""
                className="w-16 h-16 rounded-full"
              />
              <div>
                <p className="font-bold text-lg">{selectedUser.username}</p>
                <p className="text-gray-600">
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <p>{selectedUser.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pays</p>
                <p>{selectedUser.country || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ville</p>
                <p>{selectedUser.city || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Inscription</p>
                <p>{new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}