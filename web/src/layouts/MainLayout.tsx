import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ChatbotWidget from '../components/chatbot/ChatbotWidget';
import LanguageSelector from '../components/common/LanguageSelector';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-custom py-8">
        <Outlet />
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
}