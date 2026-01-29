import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { authAPI, reportsAPI } from '@/config/apiConfig';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function ApiTestScreen() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const updateResult = (name: string, status: TestResult['status'], message?: string, data?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, status, message, data } : r);
      }
      return [...prev, { name, status, message, data }];
    });
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Health Check
    updateResult('Health Check', 'pending');
    try {
      const response = await fetch(`${api.API_BASE_URL}/api/health`);
      const data = await response.json();
      if (data.status === 'ok') {
        updateResult('Health Check', 'success', 'Serveur en ligne', data);
      } else {
        updateResult('Health Check', 'error', 'Réponse inattendue');
      }
    } catch (error: any) {
      updateResult('Health Check', 'error', error.message || 'Connexion impossible');
    }

    // Test 2: Liste des signalements (public)
    updateResult('Liste Signalements', 'pending');
    try {
      const response = await reportsAPI.getReports({ limit: 5 });
      updateResult('Liste Signalements', 'success', `${response.reports?.length || 0} signalement(s) trouvé(s)`, response);
    } catch (error: any) {
      updateResult('Liste Signalements', 'error', error.message || 'Erreur');
    }

    // Test 3: Inscription test
    updateResult('Test Inscription', 'pending');
    const testEmail = `test_${Date.now()}@example.com`;
    try {
      const response = await authAPI.register({
        email: testEmail,
        password: 'test123456',
        displayName: 'Test User',
      });
      updateResult('Test Inscription', 'success', 'Compte créé avec succès', { email: testEmail });
      
      // Test 4: Vérifier le token
      updateResult('Vérification Token', 'pending');
      try {
        const meResponse = await authAPI.getMe();
        updateResult('Vérification Token', 'success', 'Token valide', meResponse);
      } catch (error: any) {
        updateResult('Vérification Token', 'error', error.message);
      }

      // Test 5: Déconnexion
      updateResult('Test Déconnexion', 'pending');
      try {
        await authAPI.logout();
        updateResult('Test Déconnexion', 'success', 'Déconnecté');
      } catch (error: any) {
        updateResult('Test Déconnexion', 'error', error.message);
      }

    } catch (error: any) {
      updateResult('Test Inscription', 'error', error.message || 'Erreur inscription');
    }

    setTesting(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      default: return 'time';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Test API Backend</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>URL du serveur:</Text>
        <Text style={styles.infoValue}>{api.API_BASE_URL}</Text>
      </View>

      <TouchableOpacity
        style={[styles.testButton, testing && styles.testButtonDisabled]}
        onPress={runTests}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Lancer les tests</Text>
          </>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.results}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={getStatusIcon(result.status)}
                size={24}
                color={getStatusColor(result.status)}
              />
              <Text style={styles.resultName}>{result.name}</Text>
            </View>
            {result.message && (
              <Text style={[styles.resultMessage, { color: getStatusColor(result.status) }]}>
                {result.message}
              </Text>
            )}
            {result.data && (
              <Text style={styles.resultData} numberOfLines={3}>
                {JSON.stringify(result.data, null, 2)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006A4E',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  testButtonDisabled: {
    opacity: 0.7,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    flex: 1,
    padding: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  resultMessage: {
    marginTop: 8,
    fontSize: 14,
  },
  resultData: {
    marginTop: 8,
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 6,
  },
});
