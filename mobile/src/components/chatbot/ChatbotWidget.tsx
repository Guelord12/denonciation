import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { MessageCircle, X, Send, Bot } from 'lucide-react-native';
import { useTheme } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  type?: 'text' | 'suggestion' | 'action';
  suggestions?: string[];
  timestamp: Date;
}

export default function ChatbotWidget() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Bonjour ! Je suis l\'assistant Dénonciation. Comment puis-je vous aider ?',
      sender: 'bot',
      type: 'suggestion',
      suggestions: ['📝 Signaler un abus', '📊 Mes signalements', '📂 Catégories', '🆘 Aide'],
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const chatbotMutation = useMutation({
    mutationFn: (message: string) => api.post('/chatbot/message', { message, language: 'fr' }),
    onSuccess: (response) => {
      const data = response.data;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: data.message,
          sender: 'bot',
          type: data.type,
          suggestions: data.suggestions,
          timestamp: new Date(),
        },
      ]);
    },
  });

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [isOpen]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');

    chatbotMutation.mutate(inputMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Bouton toggle */}
      <TouchableOpacity
        style={[styles.toggleButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X color="#FFF" size={24} />
        ) : (
          <MessageCircle color="#FFF" size={24} />
        )}
      </TouchableOpacity>

      {/* Fenêtre du chatbot */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatWindow,
            { backgroundColor: theme.colors.surface },
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
              <Bot color="#FFF" size={24} />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Assistant Dénonciation</Text>
                <Text style={styles.headerSubtitle}>En ligne • Réponse rapide</Text>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X color="#FFF" size={20} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message, index) => (
                <View key={message.id}>
                  <View
                    style={[
                      styles.messageWrapper,
                      message.sender === 'user' ? styles.userMessage : styles.botMessage,
                    ]}
                  >
                    {message.sender === 'bot' && (
                      <Bot color={theme.colors.primary} size={14} style={styles.botIcon} />
                    )}
                    <Text
                      style={[
                        styles.messageText,
                        message.sender === 'user' && { color: '#FFF' },
                        { color: message.sender === 'user' ? '#FFF' : theme.colors.text },
                      ]}
                    >
                      {message.text}
                    </Text>
                    <Text style={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {message.suggestions.map((suggestion, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.suggestionChip,
                            { backgroundColor: theme.colors.surfaceVariant },
                          ]}
                          onPress={() => handleSuggestionClick(suggestion)}
                        >
                          <Text style={[styles.suggestionText, { color: theme.colors.textSecondary }]}>
                            {suggestion}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {chatbotMutation.isPending && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputContainer, { borderTopColor: theme.colors.border }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.inputBorder,
                    color: theme.colors.inputText,
                  },
                ]}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Écrivez votre message..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: theme.colors.primary },
                  !inputMessage.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputMessage.trim() || chatbotMutation.isPending}
              >
                <Send color="#FFF" size={18} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  chatWindow: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: width - 40,
    maxWidth: 400,
    height: height * 0.6,
    maxHeight: 600,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 999,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
  },
  messageWrapper: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#EF4444',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  botIcon: {
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    marginLeft: 12,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  suggestionText: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 12,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});