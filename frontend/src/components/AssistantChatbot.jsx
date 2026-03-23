import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const AssistantChatbot = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const response = await api.post('/assistant/ask', { question, language: i18n.language });
      setAnswer(response.data.answer);
    } catch (err) {
      setError(t('assistant.unavailable'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="assistant-chatbot">
      {!isOpen && (
        <button className="assistant-toggle" onClick={() => setIsOpen(true)}>💬</button>
      )}
      {isOpen && (
        <div className="assistant-window">
          <div className="assistant-header">
            <span>{t('assistant.title')}</span>
            <button onClick={() => setIsOpen(false)}>✖</button>
          </div>
          <div className="assistant-body">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('assistant.placeholder')}
              rows="3"
            />
            <button onClick={handleAsk} disabled={loading}>
              {loading ? t('common.loading') : t('assistant.ask')}
            </button>
            {error && <div className="error-message">{error}</div>}
            {answer && (
              <div className="assistant-answer">
                <strong>{t('assistant.response')} :</strong>
                <p>{answer}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantChatbot;