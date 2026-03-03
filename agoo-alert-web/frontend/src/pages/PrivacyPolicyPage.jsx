export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique de confidentialité</h1>

      <div className="prose prose-gray max-w-none space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-3">1. Collecte des données</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Agoo Alert collecte les informations suivantes lors de votre inscription : numéro de téléphone,
            nom, prénom et mot de passe. Pour la vérification d'identité, nous collectons une photo de votre
            visage et une photo de votre pièce d'identité.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-3">2. Utilisation des données</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Vos données personnelles sont utilisées exclusivement pour :
          </p>
          <ul className="list-disc pl-5 mt-2 text-gray-600 text-sm space-y-1">
            <li>La création et la gestion de votre compte</li>
            <li>La vérification de votre identité</li>
            <li>La publication et la gestion de vos déclarations</li>
            <li>La communication entre utilisateurs via le système de chat</li>
            <li>La modération des contenus par les administrateurs</li>
          </ul>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-3">3. Protection des données</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger
            vos données personnelles contre tout accès non autorisé, modification, divulgation ou destruction.
            Les mots de passe sont chiffrés et les communications sont sécurisées.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-3">4. Accès aux données</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Les administrateurs de la plateforme ont accès aux données des utilisateurs, aux publications
            et aux conversations dans le cadre de la modération et du support. Cet accès est strictement
            limité aux besoins de fonctionnement de la plateforme.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-3">5. Conservation des données</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Les publications résolues sont archivées mais ne sont plus visibles publiquement.
            L'historique des publications peut être consulté par les administrateurs.
            Les utilisateurs peuvent demander un historique des objets trouvés via le support.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-3">6. Vos droits</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Vous avez le droit de :
          </p>
          <ul className="list-disc pl-5 mt-2 text-gray-600 text-sm space-y-1">
            <li>Accéder à vos données personnelles</li>
            <li>Modifier vos informations de profil</li>
            <li>Demander la suppression de votre compte</li>
            <li>Demander un historique de vos publications</li>
          </ul>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Pour toute question relative à la protection de vos données, veuillez contacter
            notre équipe de support via la page d'aide de la plateforme.
          </p>
        </div>
      </div>
    </div>
  );
}
