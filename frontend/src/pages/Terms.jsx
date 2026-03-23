import React from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';

const Terms = () => {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="container">
        <h1>{t('settings.terms')}</h1>
        <div className="terms-content">
          <h2>1. Acceptation des conditions</h2>
          <p>En utilisant l'application Dénonciation, vous acceptez les présentes conditions d'utilisation.</p>
          <h2>2. Contenu interdit</h2>
          <p>Il est strictement interdit de publier :</p>
          <ul>
            <li>Des images ou vidéos obscènes (nudité, actes sexuels)</li>
            <li>Des images ou vidéos de corps sans vie, d'actes barbares ou de meurtres</li>
            <li>Des propos homophobes, racistes, discriminatoires</li>
            <li>Des campagnes fanatiques ou incitations à la haine</li>
          </ul>
          <h2>3. Modération et sanctions</h2>
          <p>Les signalements sont modérés. Tout contenu interdit entraînera la suppression du signalement et une suspension temporaire ou définitive du compte.</p>
          <h2>4. Confidentialité</h2>
          <p>Vos données personnelles sont protégées conformément à la politique de confidentialité.</p>
          <h2>5. Âge minimum</h2>
          <p>L'application est interdite aux mineurs de moins de 15 ans.</p>
        </div>
      </div>
    </Layout>
  );
};

export default Terms;