import React, { useState } from 'react';
import { Phone, Search, Upload, MessageSquare, Bell, Map, User, ArrowLeft, Home, Settings, CheckCircle, AlertTriangle } from 'lucide-react';

const FindConnectApp = () => {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [language, setLanguage] = useState('fr');
  const [connectionMode, setConnectionMode] = useState('online'); // 'online', 'offline', 'ussd'
  
  const translations = {
    fr: {
      appName: 'FindConnect Afrique',
      welcomeMessage: 'Bienvenue sur FindConnect Afrique',
      tagline: 'Retrouvez vos objets perdus facilement',
      lost: 'J\'ai perdu',
      found: 'J\'ai trouvé',
      myItems: 'Mes annonces',
      inbox: 'Messages',
      notifications: 'Notifications',
      relayPoints: 'Points relais',
      profile: 'Profil',
      settings: 'Paramètres',
      submitLost: 'Signaler un objet perdu',
      submitFound: 'Signaler un objet trouvé',
      category: 'Catégorie',
      description: 'Description',
      location: 'Lieu',
      contact: 'Contact',
      submit: 'Soumettre',
      cancel: 'Annuler',
      offlineMode: 'Mode hors-ligne',
      ussdMode: 'Mode USSD',
      onlineMode: 'Mode en ligne',
      switchMode: 'Changer de mode',
      searchPlaceholder: 'Rechercher un objet...',
      recentItems: 'Objets récents',
      successMessage: 'Votre annonce a été publiée avec succès!',
      waitingSync: 'En attente de synchronisation...',
      communityRelays: 'Agents communautaires',
      languages: 'Langues',
      dataUsage: 'Utilisation des données',
      helpCenter: 'Centre d\'aide',
      about: 'À propos'
    },
    en: {
      appName: 'FindConnect Africa',
      welcomeMessage: 'Welcome to FindConnect Africa',
      tagline: 'Find your lost items easily',
      lost: 'I lost',
      found: 'I found',
      myItems: 'My listings',
      inbox: 'Messages',
      notifications: 'Notifications',
      relayPoints: 'Relay points',
      profile: 'Profile',
      settings: 'Settings',
      submitLost: 'Report a lost item',
      submitFound: 'Report a found item',
      category: 'Category',
      description: 'Description',
      location: 'Location',
      contact: 'Contact',
      submit: 'Submit',
      cancel: 'Cancel',
      offlineMode: 'Offline mode',
      ussdMode: 'USSD mode',
      onlineMode: 'Online mode',
      switchMode: 'Switch mode',
      searchPlaceholder: 'Search for an item...',
      recentItems: 'Recent items',
      successMessage: 'Your listing has been successfully published!',
      waitingSync: 'Waiting for synchronization...',
      communityRelays: 'Community agents',
      languages: 'Languages',
      dataUsage: 'Data usage',
      helpCenter: 'Help center',
      about: 'About'
    }
  };

  const t = translations[language];
  
  const categories = [
    { id: 1, name: 'Téléphones', icon: '📱' },
    { id: 2, name: 'Documents', icon: '📄' },
    { id: 3, name: 'Clés', icon: '🔑' },
    { id: 4, name: 'Sacs', icon: '👜' },
    { id: 5, name: 'Portefeuilles', icon: '👛' },
    { id: 6, name: 'Autres', icon: '📦' }
  ];
  
  const recentItems = [
    { id: 1, type: 'lost', category: 'Téléphones', title: 'Samsung Galaxy A10', location: 'Marché Sandaga, Dakar', date: '01/05/2025' },
    { id: 2, type: 'found', category: 'Documents', title: 'Carte d\'identité', location: 'Gare routière de Petersen', date: '30/04/2025' },
    { id: 3, type: 'lost', category: 'Sacs', title: 'Sac à dos bleu', location: 'Bus 21, Dakar', date: '29/04/2025' }
  ];
  
  const relayPoints = [
    { id: 1, name: 'Kiosque Central Sandaga', address: 'Marché Sandaga, Dakar', distance: '0.5 km' },
    { id: 2, name: 'Agent Modou Diop', address: 'Gare Petersen, Dakar', distance: '1.2 km' },
    { id: 3, name: 'Point relais Médina', address: 'Rue 10, Médina, Dakar', distance: '2.3 km' }
  ];

  const renderHeader = () => {
    return (
      <div className="bg-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          {currentScreen !== 'home' ? (
            <button 
              onClick={() => setCurrentScreen('home')} 
              className="p-1 rounded-full hover:bg-blue-500"
            >
              <ArrowLeft size={24} />
            </button>
          ) : (
            <div />
          )}
          <h1 className="text-xl font-bold">{t.appName}</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setConnectionMode(connectionMode === 'online' ? 'offline' : 'online')} 
              className="p-1 rounded-full hover:bg-blue-500"
            >
              {connectionMode === 'online' ? '🌐' : '📴'}
            </button>
            <button 
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} 
              className="p-1 rounded-full hover:bg-blue-500"
            >
              {language === 'fr' ? '🇫🇷' : '🇬🇧'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    return (
      <div className="bg-white border-t border-gray-200 p-2">
        <div className="flex justify-around">
          <button 
            onClick={() => setCurrentScreen('home')} 
            className={`p-2 rounded-full flex flex-col items-center ${currentScreen === 'home' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Home size={20} />
            <span className="text-xs mt-1">Accueil</span>
          </button>
          <button 
            onClick={() => setCurrentScreen('search')} 
            className={`p-2 rounded-full flex flex-col items-center ${currentScreen === 'search' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Search size={20} />
            <span className="text-xs mt-1">Recherche</span>
          </button>
          <button 
            onClick={() => setCurrentScreen('report')} 
            className={`p-2 rounded-full flex flex-col items-center ${currentScreen === 'report' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Upload size={20} />
            <span className="text-xs mt-1">Signaler</span>
          </button>
          <button 
            onClick={() => setCurrentScreen('messages')} 
            className={`p-2 rounded-full flex flex-col items-center ${currentScreen === 'messages' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <MessageSquare size={20} />
            <span className="text-xs mt-1">Messages</span>
          </button>
          <button 
            onClick={() => setCurrentScreen('profile')} 
            className={`p-2 rounded-full flex flex-col items-center ${currentScreen === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <User size={20} />
            <span className="text-xs mt-1">Profil</span>
          </button>
        </div>
      </div>
    );
  };

  const renderHomeScreen = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 bg-blue-50">
          <h2 className="text-lg font-medium mb-2">{t.welcomeMessage}</h2>
          <p className="text-gray-600 mb-4">{t.tagline}</p>
          
          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setCurrentScreen('reportLost')} 
              className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg shadow flex items-center justify-center gap-2"
            >
              <AlertTriangle size={20} />
              {t.lost}
            </button>
            <button 
              onClick={() => setCurrentScreen('reportFound')} 
              className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg shadow flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              {t.found}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2"
              />
              <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-lg font-medium mb-3">{t.recentItems}</h3>
          <div className="space-y-3">
            {recentItems.map(item => (
              <div 
                key={item.id} 
                className="border border-gray-200 rounded-lg p-3 flex items-center gap-3 bg-white shadow-sm"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {categories.find(cat => cat.name === item.category)?.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{item.title}</h4>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>{item.location}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                </div>
                <div className="h-full flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.type === 'lost' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {item.type === 'lost' ? 'Perdu' : 'Trouvé'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-medium mt-6 mb-3">{t.communityRelays}</h3>
          <div className="space-y-3">
            {relayPoints.map(point => (
              <div 
                key={point.id} 
                className="border border-gray-200 rounded-lg p-3 flex items-center gap-3 bg-white shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Map size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{point.name}</h4>
                  <div className="text-xs text-gray-500">
                    <span>{point.address}</span>
                  </div>
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  {point.distance}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const renderReportScreen = () => {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-6 text-center">Que souhaitez-vous signaler?</h2>
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => setCurrentScreen('reportLost')}
            className="bg-red-500 text-white py-6 px-4 rounded-lg shadow-md flex flex-col items-center"
          >
            <AlertTriangle size={36} className="mb-2" />
            <span className="text-lg font-medium">{t.submitLost}</span>
          </button>
          
          <button 
            onClick={() => setCurrentScreen('reportFound')}
            className="bg-green-500 text-white py-6 px-4 rounded-lg shadow-md flex flex-col items-center"
          >
            <CheckCircle size={36} className="mb-2" />
            <span className="text-lg font-medium">{t.submitFound}</span>
          </button>
        </div>
      </div>
    );
  };

  const renderReportForm = (type) => {
    const isLost = type === 'lost';
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4 text-center">
          {isLost ? t.submitLost : t.submitFound}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map(category => (
                <button 
                  key={category.id}
                  type="button"
                  className="border border-gray-300 bg-white rounded-lg p-2 flex flex-col items-center hover:bg-gray-50"
                >
                  <span className="text-2xl mb-1">{category.icon}</span>
                  <span className="text-xs">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-2 h-24"
              placeholder={isLost ? "Décrivez l'objet perdu..." : "Décrivez l'objet trouvé..."}
            ></textarea>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <button type="button" className="flex items-center text-blue-600">
                <Phone size={16} className="mr-1" />
                Ajouter description audio
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.location}</label>
            <input 
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2"
              placeholder="Marché, arrêt de bus, quartier..."
            />
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <button type="button" className="flex items-center text-blue-600">
                <Map size={16} className="mr-1" />
                Utiliser ma position
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.contact}</label>
            <input 
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2"
              placeholder="Numéro de téléphone"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setCurrentScreen('home')}
              className="flex-1 bg-gray-200 py-3 rounded-lg font-medium"
            >
              {t.cancel}
            </button>
            <button 
              type="button"
              onClick={() => setCurrentScreen('reportSuccess')}
              className={`flex-1 text-white py-3 rounded-lg font-medium ${isLost ? 'bg-red-500' : 'bg-green-500'}`}
            >
              {t.submit}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReportSuccess = () => {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full">
        <div className="bg-green-100 rounded-full p-6 mb-4">
          <CheckCircle size={64} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-center">{t.successMessage}</h2>
        
        {connectionMode === 'offline' && (
          <div className="mt-2 bg-yellow-100 p-3 rounded-lg flex items-center">
            <span className="text-yellow-700">{t.waitingSync}</span>
          </div>
        )}
        
        <button 
          onClick={() => setCurrentScreen('home')}
          className="mt-6 bg-blue-500 text-white py-3 px-6 rounded-lg font-medium w-full"
        >
          OK
        </button>
      </div>
    );
  };

  const renderProfileScreen = () => {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-3 flex items-center justify-center text-gray-400">
            <User size={48} />
          </div>
          <h2 className="text-xl font-bold">Amadou Diallo</h2>
          <p className="text-gray-600">+221 77 123 45 67</p>
        </div>
        
        <div className="space-y-3">
          <button className="w-full border border-gray-200 rounded-lg p-3 flex items-center bg-white">
            <Bell size={20} className="mr-3 text-gray-500" />
            <span>{t.notifications}</span>
          </button>
          
          <button className="w-full border border-gray-200 rounded-lg p-3 flex items-center bg-white">
            <Upload size={20} className="mr-3 text-gray-500" />
            <span>{t.myItems}</span>
          </button>
          
          <button className="w-full border border-gray-200 rounded-lg p-3 flex items-center bg-white">
            <Map size={20} className="mr-3 text-gray-500" />
            <span>{t.relayPoints}</span>
          </button>
          
          <button 
            onClick={() => setCurrentScreen('settings')}
            className="w-full border border-gray-200 rounded-lg p-3 flex items-center bg-white"
          >
            <Settings size={20} className="mr-3 text-gray-500" />
            <span>{t.settings}</span>
          </button>
        </div>
      </div>
    );
  };

  const renderSettingsScreen = () => {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">{t.settings}</h2>
        
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button 
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="w-full p-4 flex items-center justify-between bg-white"
            >
              <span>{t.languages}</span>
              <span className="text-blue-600">{language === 'fr' ? 'Français' : 'English'}</span>
            </button>
            
            <div className="border-t border-gray-200"></div>
            
            <button 
              onClick={() => setConnectionMode(
                connectionMode === 'online' ? 'offline' : 
                connectionMode === 'offline' ? 'ussd' : 'online'
              )}
              className="w-full p-4 flex items-center justify-between bg-white"
            >
              <span>{t.switchMode}</span>
              <span className="text-blue-600">
                {connectionMode === 'online' ? t.onlineMode : 
                 connectionMode === 'offline' ? t.offlineMode : 
                 t.ussdMode}
              </span>
            </button>
            
            <div className="border-t border-gray-200"></div>
            
            <button className="w-full p-4 flex items-center justify-between bg-white">
              <span>{t.dataUsage}</span>
              <span className="text-gray-500">Économe</span>
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between bg-white">
              <span>{t.helpCenter}</span>
            </button>
            
            <div className="border-t border-gray-200"></div>
            
            <button className="w-full p-4 flex items-center justify-between bg-white">
              <span>{t.about}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-100 h-screen flex flex-col overflow-hidden border border-gray-300 rounded-xl shadow-lg">
      {renderHeader()}
      
      <div className="flex-1 overflow-y-auto">
        {currentScreen === 'home' && renderHomeScreen()}
        {currentScreen === 'report' && renderReportScreen()}
        {currentScreen === 'reportLost' && renderReportForm('lost')}
        {currentScreen === 'reportFound' && renderReportForm('found')}
        {currentScreen === 'reportSuccess' && renderReportSuccess()}
        {currentScreen === 'profile' && renderProfileScreen()}
        {currentScreen === 'settings' && renderSettingsScreen()}
      </div>
      
      {renderFooter()}
    </div>
  );
};

export default FindConnectApp;