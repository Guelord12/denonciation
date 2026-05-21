import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { Zap, Send, Bot, AlertCircle, Clock, FileText } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: Date;
  language?: string;
}

interface ChatbotResponse {
  response: string;
  suggestions?: string[];
  language: string;
}

export default function ChatbotService() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('fr');

  // Mutation pour envoyer un message au chatbot
  const chatbotMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await api.post('/chatbot/message', {
        message: userMessage,
        language,
        conversationHistory: messages.map(m => ({
          sender: m.sender,
          message: m.message,
        })),
      });
      return response.data as ChatbotResponse;
    },
    onSuccess: (data) => {
      const botMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'bot',
        message: data.response,
        timestamp: new Date(),
        language: data.language,
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    },
    onError: (error: any) => {
      setIsLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Erreur chatbot',
        text2: error.message || 'Impossible de traiter votre message',
      });
    },
  });

  // Envoyer un message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: input.trim(),
      timestamp: new Date(),
      language,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    chatbotMutation.mutate(userMessage.message);
  }, [input, language]);

  // Utiliser une suggestion prédéfinie
  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    language,
    setLanguage,
    handleSendMessage,
    handleSuggestion,
  };
}

// Composant UI pour le chatbot
export function ChatbotUI() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    language,
    setLanguage,
    handleSendMessage,
  } = ChatbotService();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Bot size={24} color="#EF4444" />
        <Text style={styles.headerTitle}>Assistant Denonce</Text>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
        >
          <Text style={styles.languageButtonText}>{language.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Zap size={48} color="#EF4444" />
            <Text style={styles.emptyStateText}>Bienvenue! Comment puis-je vous aider?</Text>
            <Text style={styles.emptyStateSubtext}>
              Posez-moi des questions sur les signalements, les droits, ou l'utilisation de Denonce.
            </Text>
          </View>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.sender === 'user' && styles.userMessageRow,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.sender === 'user'
                  ? styles.userBubble
                  : styles.botBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.sender === 'user' && styles.userMessageText,
                ]}
              >
                {msg.message}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  msg.sender === 'user' && styles.userMessageTime,
                ]}
              >
                {msg.timestamp.toLocaleTimeString()}
              </Text>
            </View>
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#EF4444" />
            <Text style={styles.loadingText}>Assistant en train de répondre...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Posez votre question..."
          placeholderTextColor="#999"
          multiline
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={isLoading || !input.trim()}
        >
          <Send size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1F2937' },
  languageButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  languageButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  messagesContainer: { flex: 1, padding: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 12 },
  emptyStateSubtext: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 },
  messageRow: { marginBottom: 12, flexDirection: 'row', justifyContent: 'flex-start' },
  userMessageRow: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  botBubble: { backgroundColor: '#E5E7EB' },
  userBubble: { backgroundColor: '#EF4444' },
  messageText: { fontSize: 14, color: '#1F2937' },
  userMessageText: { color: '#FFF' },
  messageTime: { fontSize: 10, color: '#999', marginTop: 4 },
  userMessageTime: { color: '#FFF', opacity: 0.7 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  loadingText: { fontSize: 14, color: '#666' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE', gap: 8 },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1F2937' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
});

export default ChatbotUI;
