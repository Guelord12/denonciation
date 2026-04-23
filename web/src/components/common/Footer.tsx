import { Link } from 'react-router-dom';
import { Shield, Facebook, Twitter, Youtube, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="w-8 h-8 text-red-500" />
              <span className="text-xl font-bold">Dénonciation</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Plateforme citoyenne de signalement d'abus et d'injustices.
              Ensemble, luttons pour un monde plus juste.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              from G-Tech SARL
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-red-500 transition">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/reports" className="text-gray-400 hover:text-red-500 transition">
                  Signalements
                </Link>
              </li>
              <li>
                <Link to="/live" className="text-gray-400 hover:text-red-500 transition">
                  Live
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-red-500 transition">
                  À propos
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-red-500 transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Ressources</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-gray-400 hover:text-red-500 transition">
                  Centre d'aide
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-400 hover:text-red-500 transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-red-500 transition">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-red-500 transition">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link to="/security" className="text-gray-400 hover:text-red-500 transition">
                  Sécurité
                </Link>
              </li>
            </ul>
          </div>

          {/* Social & Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Suivez-nous</h4>
            <div className="flex space-x-4 mb-6">
              <a
                href="https://facebook.com/denonciation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition"
                aria-label="Facebook"
              >
                <Facebook className="w-6 h-6" />
              </a>
              <a
                href="https://twitter.com/denonciation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition"
                aria-label="Twitter"
              >
                <Twitter className="w-6 h-6" />
              </a>
              <a
                href="https://youtube.com/@denonciation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition"
                aria-label="YouTube"
              >
                <Youtube className="w-6 h-6" />
              </a>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <Mail className="w-4 h-4" />
              <a
                href="mailto:denonciation.world@gmail.com"
                className="hover:text-red-500 transition"
              >
                denonciation.world@gmail.com
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {currentYear} Dénonciation. Tous droits réservés.</p>
          <p className="mt-2">
            Fait avec <span className="text-red-500">❤️</span> pour la justice
          </p>
        </div>
      </div>
    </footer>
  );
}