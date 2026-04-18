import { useState, useEffect, useRef } from 'react';
import { Send, User } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  avatar?: string;
  message: string;
  timestamp: string;
}

interface LiveChatProps {
  streamId: number;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isAuthenticated?: boolean;
  currentUserId?: number;
}

export default function LiveChat({ 
  streamId, 
  messages, 
  onSendMessage, 
  isAuthenticated = false,
  currentUserId 
}: LiveChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">Chat en direct</h3>
        <p className="text-xs text-gray-400 mt-1">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2 ${
              msg.userId === currentUserId ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {msg.avatar ? (
              <img
                src={msg.avatar}
                alt={msg.username}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs">
                {msg.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={`flex-1 ${msg.userId === currentUserId ? 'text-right' : ''}`}>
              <div className="flex items-baseline space-x-2">
                <span className="font-medium text-white text-sm">
                  {msg.username}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistance(new Date(msg.timestamp), new Date(), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>
              <p className={`text-sm ${msg.userId === currentUserId ? 'text-red-300' : 'text-gray-300'}`}>
                {msg.message}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm">
            <a href="/login" className="text-red-500 hover:underline">
              Connectez-vous
            </a>
            {' '}pour participer au chat
          </p>
        </div>
      )}
    </div>
  );
}