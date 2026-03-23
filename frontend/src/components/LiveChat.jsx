import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const LiveChat = ({ liveId, isHost }) => {
  const { user } = useAuth();
  const { sendLiveMessage, onNewMessage, onMessageHistory, onMessageRejected, onParticipantJoined, onParticipantLeft } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadParticipants();
    const unsubscribeHistory = onMessageHistory((history) => setMessages(history));
    const unsubscribeNew = onNewMessage((message) => setMessages(prev => [...prev, message]));
    const unsubscribeRejected = onMessageRejected((data) => {
      setError(`Message rejeté: ${data.reason}`);
      setTimeout(() => setError(''), 3000);
    });
    const unsubscribeJoined = onParticipantJoined((data) => {
      setParticipantsCount(data.participantsCount);
      loadParticipants();
    });
    const unsubscribeLeft = onParticipantLeft((data) => {
      setParticipantsCount(data.participantsCount);
      loadParticipants();
    });
    return () => {
      if (unsubscribeHistory) unsubscribeHistory();
      if (unsubscribeNew) unsubscribeNew();
      if (unsubscribeRejected) unsubscribeRejected();
      if (unsubscribeJoined) unsubscribeJoined();
      if (unsubscribeLeft) unsubscribeLeft();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadParticipants = async () => {
    try {
      const response = await api.get(`/lives/${liveId}/participants`);
      setParticipants(response.data.participants);
      setParticipantsCount(response.data.total);
    } catch (err) {
      console.error('Erreur chargement participants:', err);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendLiveMessage(liveId, inputMessage, replyTo?.id);
    setInputMessage('');
    setReplyTo(null);
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="live-chat-container">
      <div className="live-chat-header">
        <div className="participants-info">
          <button onClick={() => setShowParticipants(!showParticipants)} className="participants-toggle">
            👥 {participantsCount} participant{participantsCount > 1 ? 's' : ''}
          </button>
          {showParticipants && (
            <div className="participants-list">
              <h4>Participants ({participantsCount})</h4>
              <ul>
                {participants.map(p => (
                  <li key={p.id}><img src={p.avatar || '/anonymous-avatar.png'} alt="" /> <span>Anonyme</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {isHost && <span className="host-badge">🎥 Hôte</span>}
      </div>
      <div className="live-chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.isHost ? 'host-message' : ''} ${msg.user_id === user?.id ? 'own-message' : ''}`}>
            <div className="message-header">
              <strong className={msg.isHost ? 'host-name' : ''}>{msg.isHost ? '🎙️ Hôte' : 'Anonyme'}</strong>
              <span className="message-time">{formatTime(msg.created_at)}</span>
            </div>
            {msg.replyTo && (
              <div className="reply-indicator">
                <span>↳ Réponse à : {msg.replyTo.username}</span>
                <p className="replied-message">{msg.replyTo.message.substring(0, 50)}...</p>
              </div>
            )}
            <div className="message-content">{msg.message}</div>
            <div className="message-actions">
              <button onClick={() => setReplyTo(msg)} className="reply-btn">↩️ Répondre</button>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {replyTo && (
        <div className="reply-bar">
          <span>Réponse à : {replyTo.username}</span>
          <button onClick={() => setReplyTo(null)}>✖</button>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSend} className="live-chat-input">
        <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder={replyTo ? `Répondre à ${replyTo.username}...` : "Écrivez un message..."} />
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
};

export default LiveChat;