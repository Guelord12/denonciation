export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Conditions Générales d'Utilisation
      </h1>

      <div className="bg-white rounded-lg shadow p-8 space-y-6 text-gray-700">
        <p className="text-sm text-gray-500">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
        </p>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. Acceptation des conditions</h2>
          <p>
            En accédant et en utilisant la plateforme Dénonciation, vous acceptez d'être lié
            par les présentes conditions générales d'utilisation. Si vous n'acceptez pas ces
            conditions, veuillez ne pas utiliser notre service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">2. Description du service</h2>
          <p>
            Dénonciation est une plateforme de signalement citoyen permettant aux utilisateurs
            de signaler des abus, des injustices et des violations des droits humains.
            La plateforme permet également de suivre l'évolution des signalements et d'y
            apporter des témoignages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">3. Inscription et compte</h2>
          <p>
            Pour utiliser certaines fonctionnalités de la plateforme, vous devez créer un compte.
            Vous êtes responsable de maintenir la confidentialité de vos identifiants et de
            toutes les activités qui se produisent sous votre compte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. Contenu utilisateur</h2>
          <p>
            En soumettant du contenu sur Dénonciation, vous déclarez et garantissez que :
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Le contenu est véridique et précis</li>
            <li>Vous avez le droit de partager ce contenu</li>
            <li>Le contenu ne viole pas les droits de tiers</li>
            <li>Le contenu n'est pas diffamatoire, obscène ou illégal</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            5. Signalements et modération
          </h2>
          <p>
            Tous les signalements sont soumis à une modération avant publication.
            Dénonciation se réserve le droit de refuser, modifier ou supprimer tout contenu
            qui ne respecterait pas les présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. Protection des données</h2>
          <p>
            Nous prenons la protection de vos données personnelles très au sérieux.
            Consultez notre Politique de Confidentialité pour comprendre comment nous
            collectons, utilisons et protégeons vos informations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">7. Responsabilité</h2>
          <p>
            Dénonciation agit en tant qu'hébergeur de contenu et ne peut être tenue responsable
            des contenus publiés par les utilisateurs. Cependant, nous nous engageons à retirer
            rapidement tout contenu signalé comme illégal.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">8. Suspension et résiliation</h2>
          <p>
            Nous nous réservons le droit de suspendre ou de résilier votre compte en cas de
            violation des présentes conditions, sans préavis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">9. Modifications des conditions</h2>
          <p>
            Nous pouvons modifier ces conditions à tout moment. Les modifications seront
            effectives dès leur publication sur la plateforme. Votre utilisation continue
            du service constitue votre acceptation des conditions modifiées.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">10. Contact</h2>
          <p>
            Pour toute question concernant ces conditions, veuillez nous contacter à :
            <br />
            <a href="mailto:legal@denonciation.com" className="text-red-600 hover:underline">
              legal@denonciation.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}