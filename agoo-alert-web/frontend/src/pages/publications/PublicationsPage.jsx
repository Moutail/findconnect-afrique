import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicationAPI } from '../../lib/api';
import { Search, Filter, MapPin, Clock, Eye, Tag } from 'lucide-react';
import { PUBLICATION_TYPE_LABELS, CATEGORY_LABELS, timeAgo } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function PublicationsPage() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ type: '', category: '', search: '', city: '', page: 1 });

  useEffect(() => {
    loadPublications();
  }, [filters.type, filters.category, filters.city, filters.page]);

  const loadPublications = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 12 };
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.city) params.city = filters.city;
      if (filters.search) params.search = filters.search;

      const { data } = await publicationAPI.list(params);
      setPublications(data.publications);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
    loadPublications();
  };

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header band */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Publications</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {pagination.total ? `${pagination.total} déclaration(s)` : 'Toutes les déclarations'}
              </p>
            </div>
            <Link to="/publications/create" className="btn-accent text-sm flex items-center gap-1.5">
              <Filter className="w-4 h-4" /> Nouvelle déclaration
            </Link>
          </div>

          {/* Filters */}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input-field pl-10 text-sm"
                placeholder="Titre, description, lieu..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <select
              className="input-field w-auto text-sm"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
            >
              <option value="">Tous les types</option>
              <option value="lost">Perdu</option>
              <option value="found">Trouvé</option>
            </select>
            <select
              className="input-field w-auto text-sm"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
            >
              <option value="">Toutes catégories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary text-sm flex items-center gap-1.5">
              <Search className="w-4 h-4" /> Rechercher
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <LoadingSpinner />
        ) : publications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-500">Aucune publication trouvée</h3>
            <p className="text-gray-400 mt-1 text-sm">Essayez de modifier vos filtres de recherche</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {publications.map((pub) => (
                <Link key={pub._id || pub.id} to={`/publications/${pub._id || pub.id}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                  {/* Image */}
                  {pub.images && pub.images.length > 0 ? (
                    <div className="w-full h-48 overflow-hidden bg-gray-100">
                      <img src={pub.images[0].thumbnail || pub.images[0].url} alt={pub.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-warm-100 flex items-center justify-center">
                      <Tag className="w-10 h-10 text-warm-300" />
                    </div>
                  )}

                  <div className="p-4">
                    {/* Badges */}
                    <div className="flex gap-1.5 mb-2.5">
                      <span className={`badge text-xs ${pub.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'}`}>
                        {PUBLICATION_TYPE_LABELS[pub.type]}
                      </span>
                      <span className="badge bg-gray-100 text-gray-600 text-xs">
                        {CATEGORY_LABELS[pub.mainCategory]}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2 mb-1">
                      {pub.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{pub.description}</p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                      {pub.location?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {pub.location.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(pub.createdAt)}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <Eye className="w-3 h-3" /> {pub.views || 0}
                      </span>
                    </div>

                    {/* Author */}
                    {pub.createdBy && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary-700">
                            {pub.createdBy.firstName?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 truncate">
                          {pub.createdBy.firstName} {pub.createdBy.lastName}
                        </span>
                        {pub.publishedBy === 'organization' && (
                          <span className="badge bg-accent-100 text-accent-700 text-xs ml-auto shrink-0">Org.</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setFilters(prev => ({ ...prev, page: p }))}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      p === filters.page
                        ? 'bg-primary-700 text-white shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
