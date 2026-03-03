import { Link } from 'react-router-dom';
import { Search, Shield, MessageSquare, Building2, Users, FileText, ArrowRight, HelpCircle, MapPin, Heart, CheckCircle } from 'lucide-react';

const STATS = [
  { label: 'Déclarations publiées', value: '2 400+' },
  { label: 'Objets retrouvés', value: '870+' },
  { label: 'Organisations actives', value: '120+' },
  { label: 'Villes couvertes', value: '30+' },
];

const CATEGORIES = [
  { emoji: '👤', label: 'Personnes', color: 'bg-blue-50 text-blue-700' },
  { emoji: '🐕', label: 'Animaux', color: 'bg-orange-50 text-orange-700' },
  { emoji: '📱', label: 'Objets', color: 'bg-purple-50 text-purple-700' },
  { emoji: '🚗', label: 'Véhicules', color: 'bg-red-50 text-red-700' },
  { emoji: '📄', label: 'Documents', color: 'bg-yellow-50 text-yellow-700' },
  { emoji: '🎒', label: 'Autres', color: 'bg-teal-50 text-teal-700' },
];

export default function HomePage() {
  return (
    <div className="bg-warm-50">

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
        {/* Cercles décoratifs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-primary-500/20 blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/20">
                <MapPin className="w-4 h-4 text-accent-400" />
                Plateforme nationale — Togo
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6">
                Retrouvez ce qui vous est
                <span className="text-accent-400"> cher</span>
              </h1>
              <p className="text-lg text-primary-200 leading-relaxed mb-8 max-w-xl">
                Déclarez vos pertes de personnes, objets ou animaux. Mobilisez toute la communauté pour retrouver ce qui compte le plus pour vous.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/publications/create"
                  className="inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold py-3.5 px-7 rounded-2xl shadow-lg transition-all text-base"
                >
                  <FileText className="w-5 h-5" /> Faire une déclaration
                </Link>
                <Link
                  to="/publications"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold py-3.5 px-7 rounded-2xl border border-white/25 transition-all text-base"
                >
                  <Search className="w-5 h-5" /> Voir les publications
                </Link>
              </div>
            </div>

            {/* Stats panel */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/15">
                  <p className="text-3xl font-black text-accent-400 mb-1">{s.value}</p>
                  <p className="text-sm text-primary-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CATÉGORIES ===== */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">Toutes les catégories</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.label}
                to={`/publications?category=${c.label.toLowerCase()}`}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl ${c.color} hover:shadow-sm transition-all text-xs font-semibold`}
              >
                <span className="text-2xl">{c.emoji}</span>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE ===== */}
      <section className="py-20 bg-warm-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-accent-600 font-bold text-sm uppercase tracking-widest mb-2">Simple & rapide</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Comment ça marche ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {[
              {
                num: '01', icon: FileText, color: 'bg-primary-100 text-primary-700',
                title: 'Déclarez',
                desc: 'Remplissez notre formulaire guidé étape par étape pour décrire votre perte ou trouvaille avec photos.',
              },
              {
                num: '02', icon: Search, color: 'bg-accent-100 text-accent-700',
                title: 'La communauté recherche',
                desc: 'Votre déclaration est visible par des milliers de personnes et organisations partenaires.',
              },
              {
                num: '03', icon: MessageSquare, color: 'bg-green-100 text-green-700',
                title: 'Prenez contact',
                desc: 'Discutez en toute sécurité via notre messagerie intégrée pour organiser la restitution.',
              },
            ].map((step) => (
              <div key={step.num} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-5">
                  <span className="text-4xl font-black text-gray-100">{step.num}</span>
                  <div className={`w-12 h-12 ${step.color} rounded-2xl flex items-center justify-center shrink-0`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== POUR QUI ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-accent-600 font-bold text-sm uppercase tracking-widest mb-2">Rejoignez-nous</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Pour qui ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-3xl border-2 border-primary-100 bg-gradient-to-br from-primary-50 to-white p-8 hover:border-primary-300 transition-colors">
              <div className="w-14 h-14 bg-primary-700 rounded-2xl flex items-center justify-center mb-5">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3">Particuliers</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Créez un compte avec votre téléphone. Vérifiez votre identité et publiez vos déclarations.
              </p>
              <ul className="space-y-2 mb-6">
                {['Inscription gratuite', 'Vérification d\'identité', 'Chat sécurisé'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-primary-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="inline-flex items-center gap-1.5 text-primary-700 font-bold text-sm hover:text-primary-900 transition-colors">
                Créer un compte <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="rounded-3xl border-2 border-accent-100 bg-gradient-to-br from-accent-50 to-white p-8 hover:border-accent-300 transition-colors">
              <div className="w-14 h-14 bg-accent-600 rounded-2xl flex items-center justify-center mb-5">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3">Organisations</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Écoles, hôpitaux, commissariats, gares... Publiez directement sans attendre de modération.
              </p>
              <ul className="space-y-2 mb-6">
                {['Publication immédiate', 'Badge vérifié', 'Statistiques avancées'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-accent-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register-organization" className="inline-flex items-center gap-1.5 text-accent-700 font-bold text-sm hover:text-accent-900 transition-colors">
                Inscrire une organisation <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SUPPORT CTA ===== */}
      <section className="py-16 bg-gradient-to-r from-primary-900 to-primary-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-accent-500/10 blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Besoin d'aide ?</h2>
          <p className="text-primary-200 mb-8 leading-relaxed">
            Notre équipe de support est là pour vous aider à publier vos déclarations, même sans expérience digitale.
          </p>
          <Link to="/support" className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg transition-all">
            Contacter le support
          </Link>
        </div>
      </section>
    </div>
  );
}
