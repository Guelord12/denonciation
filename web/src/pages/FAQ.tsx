import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqCategories = [
  {
    category: 'Général',
    items: [
      {
        question: 'Qu\'est-ce que Dénonciation ?',
        answer: 'Dénonciation est une plateforme citoyenne qui permet de signaler des abus, des injustices et des violations des droits humains de manière sécurisée et anonyme si vous le souhaitez.',
      },
      {
        question: 'Est-ce gratuit ?',
        answer: 'Oui, l\'utilisation de Dénonciation est entièrement gratuite pour tous les utilisateurs.',
      },
      {
        question: 'Qui peut voir mes signalements ?',
        answer: 'Vos signalements sont visibles publiquement une fois approuvés par notre équipe de modération. Vous pouvez choisir de rester anonyme.',
      },
    ],
  },
  {
    category: 'Signalements',
    items: [
      {
        question: 'Comment créer un signalement ?',
        answer: 'Pour créer un signalement, cliquez sur "Signaler un abus", remplissez le formulaire avec les détails de la situation, ajoutez des preuves (photos, vidéos) si possible, et soumettez-le.',
      },
      {
        question: 'Combien de temps faut-il pour qu\'un signalement soit approuvé ?',
        answer: 'Nos modérateurs examinent les signalements sous 24 à 48 heures en moyenne.',
      },
      {
        question: 'Puis-je modifier ou supprimer mon signalement ?',
        answer: 'Vous pouvez modifier votre signalement tant qu\'il n\'a pas été approuvé. Une fois approuvé, contactez-nous pour toute modification.',
      },
      {
        question: 'Que faire si mon signalement est rejeté ?',
        answer: 'Si votre signalement est rejeté, vous recevrez une explication. Vous pouvez le modifier et le soumettre à nouveau ou contacter notre équipe.',
      },
    ],
  },
  {
    category: 'Lives',
    items: [
      {
        question: 'Comment démarrer un live ?',
        answer: 'Cliquez sur "Go Live" dans le menu, donnez un titre à votre stream, et commencez à diffuser. Vous aurez besoin d\'une connexion internet stable.',
      },
      {
        question: 'Qu\'est-ce qu\'un stream premium ?',
        answer: 'Un stream premium est un live payant. Les spectateurs doivent s\'abonner pour y accéder. Vous recevez 80% des revenus générés.',
      },
      {
        question: 'Puis-je programmer un live à l\'avance ?',
        answer: 'Oui, vous pouvez programmer un live en spécifiant la date et l\'heure de début. Les spectateurs pourront s\'inscrire pour être notifiés.',
      },
    ],
  },
  {
    category: 'Compte et sécurité',
    items: [
      {
        question: 'Comment réinitialiser mon mot de passe ?',
        answer: 'Sur la page de connexion, cliquez sur "Mot de passe oublié". Vous recevrez un email avec un lien pour réinitialiser votre mot de passe.',
      },
      {
        question: 'Comment activer l\'authentification à deux facteurs ?',
        answer: 'Allez dans Paramètres > Sécurité > Authentification à deux facteurs et suivez les instructions.',
      },
      {
        question: 'Que faire si mon compte est piraté ?',
        answer: 'Contactez immédiatement notre support à security@denonciation.com. Nous vous aiderons à récupérer votre compte.',
      },
      {
        question: 'Comment supprimer mon compte ?',
        answer: 'Allez dans Paramètres > Zone dangereuse > Supprimer mon compte. Cette action est irréversible.',
      },
    ],
  },
  {
    category: 'Confidentialité',
    items: [
      {
        question: 'Mes informations sont-elles protégées ?',
        answer: 'Oui, nous prenons la sécurité de vos données très au sérieux. Consultez notre Politique de Confidentialité pour plus de détails.',
      },
      {
        question: 'Puis-je signaler de manière anonyme ?',
        answer: 'Oui, vous pouvez choisir de publier votre signalement de manière anonyme. Votre identité ne sera pas révélée publiquement.',
      },
      {
        question: 'Combien de temps conservez-vous mes données ?',
        answer: 'Nous conservons vos données aussi longtemps que votre compte est actif. Après suppression, certaines données peuvent être conservées pour des raisons légales.',
      },
    ],
  },
];

function FAQSection({ category, items }: { category: string; items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{category}</h2>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
            >
              <span className="font-medium text-gray-900">{item.question}</span>
              {openIndex === index ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 bg-gray-50 border-t">
                <p className="text-gray-700">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Foire Aux Questions (FAQ)
      </h1>

      <div className="mb-8">
        <p className="text-gray-600">
          Vous trouverez ci-dessous les réponses aux questions les plus fréquemment posées.
          Si vous ne trouvez pas la réponse à votre question, n'hésitez pas à{' '}
          <a href="mailto:support@denonciation.com" className="text-red-600 hover:underline">
            nous contacter
          </a>
          .
        </p>
      </div>

      {faqCategories.map((cat, index) => (
        <FAQSection key={index} category={cat.category} items={cat.items} />
      ))}

      <div className="mt-12 p-6 bg-red-50 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Vous n'avez pas trouvé votre réponse ?
        </h3>
        <p className="text-red-700 mb-4">
          Notre équipe de support est disponible pour vous aider.
        </p>
        <a
          href="mailto:support@denonciation.com"
          className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
        >
          Contacter le support
        </a>
      </div>
    </div>
  );
}