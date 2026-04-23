export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Politique de Confidentialité
      </h1>

      <div className="bg-white rounded-lg shadow p-8 space-y-6 text-gray-700">
        <p className="text-sm text-gray-500">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
        </p>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. Introduction</h2>
          <p>
            La protection de vos données personnelles est une priorité pour Dénonciation.
            Cette politique explique comment nous collectons, utilisons et protégeons vos
            informations personnelles lorsque vous utilisez notre plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            2. Données collectées
          </h2>
          <p>Nous collectons les types de données suivants :</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              <strong>Données d'inscription :</strong> nom, prénom, email, nom d'utilisateur,
              mot de passe
            </li>
            <li>
              <strong>Données de profil :</strong> photo de profil, téléphone, localisation,
              date de naissance
            </li>
            <li>
              <strong>Contenu utilisateur :</strong> signalements, commentaires, témoignages,
              médias
            </li>
            <li>
              <strong>Données techniques :</strong> adresse IP, type de navigateur, pages
              visitées
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            3. Utilisation des données
          </h2>
          <p>Nous utilisons vos données pour :</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Fournir et améliorer nos services</li>
            <li>Personnaliser votre expérience</li>
            <li>Communiquer avec vous</li>
            <li>Assurer la sécurité de la plateforme</li>
            <li>Respecter nos obligations légales</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. Partage des données</h2>
          <p>
            Nous ne vendons pas vos données personnelles. Nous pouvons partager vos données
            avec :
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Des prestataires de services (hébergement, email, SMS)</li>
            <li>Les autorités compétentes si la loi l'exige</li>
            <li>D'autres utilisateurs, selon vos paramètres de confidentialité</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">5. Sécurité des données</h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger
            vos données contre l'accès non autorisé, la modification, la divulgation ou la
            destruction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. Vos droits</h2>
          <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            7. Conservation des données
          </h2>
          <p>
            Nous conservons vos données aussi longtemps que nécessaire pour fournir nos services
            et respecter nos obligations légales. Vous pouvez demander la suppression de votre
            compte à tout moment.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">8. Cookies</h2>
          <p>
            Nous utilisons des cookies pour améliorer votre expérience sur notre plateforme.
            Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">9. Modifications</h2>
          <p>
            Nous pouvons modifier cette politique à tout moment. Les modifications seront
            publiées sur cette page avec la date de mise à jour.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">10. Contact</h2>
          <p>
            Pour toute question concernant cette politique ou vos données personnelles :
            <br />
            <a href="denonciation.world@gmail.com" className="text-red-600 hover:underline">
              privacy@denonciation.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}