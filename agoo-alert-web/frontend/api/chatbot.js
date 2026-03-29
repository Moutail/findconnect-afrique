// Vercel Serverless Function pour le chatbot Groq
const CHATBOT_SYSTEM_PROMPT = `Tu es l'assistant virtuel d'Agoo Alert, la plateforme nationale d'alerte du Togo pour les personnes et objets perdus/trouvés.

## À propos d'Agoo Alert
Agoo Alert est une plateforme web et mobile qui permet aux citoyens togolais de :
- Déclarer des personnes disparues ou retrouvées
- Signaler des objets perdus ou trouvés
- Communiquer avec les déclarants via un système de chat sécurisé
- Consulter les alertes publiées par la communauté

## Pages et fonctionnalités du site

### 1. Accueil (/)
- Présentation de la plateforme
- Statistiques des alertes
- Accès rapide aux publications récentes

### 2. Publications (/publications)
- Liste de toutes les alertes publiées
- Filtres par type : personnes, objets perdus, objets trouvés
- Recherche par titre ou ville

### 3. Créer une publication (/publications/create)
- Formulaire pour déclarer une personne ou un objet
- Types : Personne disparue/retrouvée, Objet perdu/trouvé
- Ajoutez des photos, description, localisation

### 4. Messages (/conversations)
- Voir toutes vos conversations
- Pour contacter un déclarant, envoyez d'abord une demande de chat
- Le déclarant doit accepter avant de pouvoir discuter

### 5. Profil (/profile)
- Modifiez vos informations personnelles
- Vérification d'identité pour plus de crédibilité

### 6. Support (/support)
- Contactez l'équipe support
- Signalez un problème

## Comment utiliser le site

### Pour déclarer une personne/objet perdu :
1. Connectez-vous à votre compte
2. Allez dans "Créer une publication"
3. Choisissez le type (personne ou objet)
4. Sélectionnez "Perdu" ou "Trouvé"
5. Remplissez les informations et publiez

### Pour contacter un déclarant :
1. Trouvez l'alerte qui vous intéresse
2. Cliquez sur "Demander à discuter"
3. Attendez l'acceptation du déclarant
4. Une fois accepté, accédez à la conversation

## Conseils de sécurité
- Ne partagez jamais d'informations sensibles
- Méfiez-vous des arnaques
- Privilégiez les rencontres dans des lieux publics

INSTRUCTIONS :
- Réponds toujours en français
- Sois amical, clair et concis
- Guide l'utilisateur étape par étape si nécessaire`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Service chatbot non configuré" });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Format de messages invalide" });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      return res.status(502).json({ error: "Erreur du service IA" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Je n'ai pas pu générer une réponse.";
    
    return res.status(200).json({ content });
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ error: "Erreur de connexion au service IA" });
  }
}
