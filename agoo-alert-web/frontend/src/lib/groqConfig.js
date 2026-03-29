// Configuration du chatbot d'aide via le backend
// L'API Groq est appelée côté serveur pour sécuriser la clé API

const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function sendMessageToGroq(messages) {
  try {
    const response = await fetch(`${API_URL}/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Chatbot API error:', errorData);
      return errorData.error || "Désolé, une erreur s'est produite. Réessayez.";
    }

    const data = await response.json();
    return data.content || "Je n'ai pas pu générer une réponse.";
  } catch (error) {
    console.error('Chatbot fetch error:', error);
    return "Erreur de connexion. Vérifiez votre connexion internet.";
  }
}
