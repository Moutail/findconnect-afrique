import { Search, Users, Building2, Shield, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">À propos d'Agoo Alert</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Agoo Alert est une plateforme communautaire dédiée à la déclaration et la recherche d'objets perdus, de personnes disparues et d'animaux égarés.
        </p>
      </div>

      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Notre mission</h2>
        <p className="text-gray-600 leading-relaxed">
          Nous croyons que chaque objet perdu mérite d'être retrouvé, que chaque personne disparue mérite d'être recherchée.
          Agoo Alert facilite la mise en relation entre ceux qui ont perdu et ceux qui ont trouvé, en offrant une plateforme
          simple, sécurisée et accessible à tous.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Pour les particuliers</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Créez un compte simple avec votre numéro de téléphone, vérifiez votre identité et publiez vos déclarations
            de perte ou de trouvaille. Le système de chat intégré permet une communication directe et sécurisée.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-accent-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Pour les organisations</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Écoles, universités, centres de formation, hôpitaux et lieux publics peuvent s'inscrire en tant qu'organisation
            pour publier directement les objets trouvés dans leurs locaux. Aucune validation préalable n'est nécessaire
            pour les organisations vérifiées.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Sécurité</h3>
          </div>
          <p className="text-gray-600 text-sm">
            La vérification d'identité par photo et pièce d'identité garantit la fiabilité des publications.
            Chaque déclaration d'un utilisateur simple est validée par un administrateur avant publication.
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Accessibilité</h3>
          </div>
          <p className="text-gray-600 text-sm">
            Nous offrons un support dédié pour les personnes ayant des difficultés avec le formulaire en ligne.
            Notre équipe peut vous aider à poster votre déclaration par téléphone.
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Comment fonctionne la plateforme ?</h2>
        <ol className="space-y-4 text-gray-600">
          <li className="flex gap-3">
            <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
            <div>
              <p className="font-medium text-gray-900">Inscription</p>
              <p className="text-sm">Créez un compte avec votre numéro de téléphone, nom, prénom et mot de passe.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
            <div>
              <p className="font-medium text-gray-900">Vérification d'identité</p>
              <p className="text-sm">Prenez une photo de votre visage et de votre pièce d'identité (carte, passeport, permis).</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
            <div>
              <p className="font-medium text-gray-900">Publication</p>
              <p className="text-sm">Remplissez le formulaire guidé étape par étape pour décrire votre perte ou trouvaille.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
            <div>
              <p className="font-medium text-gray-900">Validation</p>
              <p className="text-sm">Un administrateur valide votre publication avant qu'elle ne soit visible publiquement.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
            <div>
              <p className="font-medium text-gray-900">Communication</p>
              <p className="text-sm">Celui qui a trouvé envoie une invitation de chat. Celui qui a perdu accepte et la discussion commence.</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
