import { useState } from 'react';
import { supportAPI } from '../lib/api';
import { HelpCircle, Phone, User, FileText, Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SupportPage() {
  const [tab, setTab] = useState('help');
  const [loading, setLoading] = useState(false);
  const [helpForm, setHelpForm] = useState({
    contactName: '', contactPhone: '', requestType: 'publication_help', description: '',
  });
  const [historyForm, setHistoryForm] = useState({
    contactName: '', contactPhone: '', description: '',
  });
  const [historyResults, setHistoryResults] = useState(null);

  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supportAPI.createRequest(helpForm);
      toast.success('Demande envoyée ! Un agent vous contactera bientôt.');
      setHelpForm({ contactName: '', contactPhone: '', requestType: 'publication_help', description: '' });
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await supportAPI.historyRequest(historyForm);
      setHistoryResults(data);
      if (data.results?.length > 0) {
        toast.success(`${data.results.length} résultat(s) trouvé(s)`);
      } else {
        toast.info('Aucun résultat. Votre demande a été enregistrée.');
      }
    } catch (error) {
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <HelpCircle className="w-12 h-12 text-primary-600 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-gray-900">Support & Aide</h1>
        <p className="text-gray-500 mt-2">
          Besoin d'aide pour publier une déclaration ou rechercher un objet ? Notre équipe est là pour vous.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 justify-center">
        <button
          onClick={() => setTab('help')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'help' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Demander de l'aide
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'history' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Historique d'objets trouvés
        </button>
      </div>

      {/* Help form */}
      {tab === 'help' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Demande d'assistance</h2>
          <p className="text-sm text-gray-500 mb-6">
            Si vous avez des difficultés avec le formulaire en ligne, un agent peut vous aider à publier
            votre déclaration par téléphone.
          </p>

          <form onSubmit={handleHelpSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text" className="input-field pl-10" placeholder="Nom complet"
                  value={helpForm.contactName}
                  onChange={(e) => setHelpForm(prev => ({ ...prev, contactName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel" className="input-field pl-10" placeholder="+228 90 00 00 00"
                  value={helpForm.contactPhone}
                  onChange={(e) => setHelpForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de demande</label>
              <select
                className="input-field"
                value={helpForm.requestType}
                onChange={(e) => setHelpForm(prev => ({ ...prev, requestType: e.target.value }))}
              >
                <option value="publication_help">Aide pour publier une déclaration</option>
                <option value="account_help">Aide avec mon compte</option>
                <option value="other">Autre demande</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Décrivez votre besoin</label>
              <textarea
                className="input-field" rows="4"
                placeholder="Décrivez ce dont vous avez besoin..."
                value={helpForm.description}
                onChange={(e) => setHelpForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-5 h-5" /> Envoyer la demande</>}
            </button>
          </form>
        </div>
      )}

      {/* History search */}
      {tab === 'history' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Recherche dans l'historique</h2>
          <p className="text-sm text-gray-500 mb-6">
            Recherchez si un objet que vous avez perdu a déjà été trouvé et déclaré sur la plateforme.
          </p>

          <form onSubmit={handleHistorySubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
              <input
                type="text" className="input-field" placeholder="Nom complet"
                value={historyForm.contactName}
                onChange={(e) => setHistoryForm(prev => ({ ...prev, contactName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel" className="input-field" placeholder="+228 90 00 00 00"
                value={historyForm.contactPhone}
                onChange={(e) => setHistoryForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Décrivez l'objet recherché</label>
              <textarea
                className="input-field" rows="4"
                placeholder="Décrivez l'objet que vous avez perdu (type, couleur, marque, lieu, date...)..."
                value={historyForm.description}
                onChange={(e) => setHistoryForm(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Search className="w-5 h-5" /> Rechercher</>}
            </button>
          </form>

          {historyResults && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold mb-3">Résultats ({historyResults.results?.length || 0})</h3>
              {historyResults.results?.length > 0 ? (
                <div className="space-y-3">
                  {historyResults.results.map((pub, i) => (
                    <a key={i} href={`/publications/${pub._id || pub.id}`} className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <p className="font-medium text-gray-900">{pub.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{pub.description}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun résultat correspondant. Votre demande a été enregistrée et un agent vous contactera.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
