import React from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';

const Privacy = () => {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="container">
        <h1>{t('settings.privacy')}</h1>
        <div className="privacy-content">
          <h2>Collecte des données</h2>
          <p>Nous collectons les informations que vous fournissez lors de l'inscription (nom, email, etc.) et les signalements que vous publiez.</p>
          <h2>Utilisation des données</h2>
          <p>Les données sont utilisées pour faire fonctionner l'application et pour des statistiques anonymes.</p>
          <h2>Partage des données</h2>
          <p>Nous ne partageons pas vos données personnelles avec des tiers sans votre consentement.</p>
          <h2>Sécurité</h2>
          <p>Nous mettons en œuvre des mesures de sécurité pour protéger vos données.</p>
          <h2>Vos droits</h2>
          <p>Vous pouvez demander la suppression de vos données à tout moment.</p>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;