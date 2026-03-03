import { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { Users, Search, Ban, KeyRound, Trash2, Eye } from 'lucide-react';
import { VERIFICATION_LABELS, formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ search: '', role: '', page: 1 });

  useEffect(() => {
    loadUsers();
  }, [filters.role, filters.page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.role) params.role = filters.role;
      const { data } = await adminAPI.getUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId) => {
    if (!confirm('Confirmer cette action ?')) return;
    try {
      const { data } = await adminAPI.banUser(userId, {});
      toast.success(data.message);
      loadUsers();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Réinitialiser le mot de passe ?')) return;
    try {
      const { data } = await adminAPI.resetPassword(userId);
      toast.success(data.message);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Supprimer cet utilisateur définitivement ?')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('Utilisateur supprimé');
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-700" />
          </div>
          Gestion des utilisateurs
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" className="input-field pl-10 text-sm" placeholder="Rechercher par nom ou téléphone..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
          />
        </div>
        <select className="input-field w-auto text-sm" value={filters.role} onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value, page: 1 }))}>
          <option value="">Tous les rôles</option>
          <option value="user">Utilisateur</option>
          <option value="organization">Organisation</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={loadUsers} className="btn-primary text-sm">Rechercher</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-warm-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">Utilisateur</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">Téléphone</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">Rôle</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">Vérification</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">Date</th>
                  <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-warm-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                          {u.firstName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{u.firstName} {u.lastName}</p>
                          {u.isBanned && <span className="badge-danger text-xs">Banni</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{u.phone}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge text-xs ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'organization' ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge text-xs ${u.verificationStatus === 'approved' ? 'bg-primary-100 text-primary-700' : u.verificationStatus === 'pending' ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-500'}`}>
                        {VERIFICATION_LABELS[u.verificationStatus]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        {u.role !== 'admin' && (
                          <>
                            <button onClick={() => handleBan(u.id)} className="p-1.5 text-accent-600 hover:bg-accent-50 rounded-lg transition-colors" title={u.isBanned ? 'Débannir' : 'Bannir'}>
                              <Ban className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleResetPassword(u.id)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Réinitialiser mot de passe">
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setFilters(prev => ({ ...prev, page: p }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${p === filters.page ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
