import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Users,
  Eye,
  Globe,
  Award,
  Heart,
  Lock,
  FileText,
  HelpCircle,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function Information() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stats = [
    { icon: Users, value: '10,000+', label: 'Utilisateurs' },
    { icon: Eye, value: '5,000+', label: 'Signalements' },
    { icon: Globe, value: '20+', label: 'Pays' },
    { icon: Award, value: '89%', label: 'Résolution' },
  ];

  const values = [
    {
      icon: Shield,
      title: 'Protection',
      description: 'Nous protégeons l\'identité des lanceurs d\'alerte et des victimes grâce à un système d\'anonymat complet.',
    },
    {
      icon: Heart,
      title: 'Solidarité',
      description: 'Nous croyons en la force collective pour dénoncer les injustices et créer un monde plus juste.',
    },
    {
      icon: Eye,
      title: 'Transparence',
      description: 'Chaque signalement est traité avec la plus grande transparence tout en préservant l\'anonymat.',
    },
  ];

  const faqItems: FAQItem[] = [
    {
      question: 'Comment fonctionne l\'anonymat sur Dénonciation ?',
      answer: 'Tous les signalements, commentaires, témoignages, likes et partages sont totalement anonymes. Les autres utilisateurs ne verront que "Utilisateur anonyme". Seuls les administrateurs ont accès aux identités réelles pour pouvoir traiter les signalements.',
    },
    {
      question: 'Qui peut voir mon identité ?',
      answer: 'Uniquement les administrateurs de la plateforme peuvent voir votre identité. Cela nous permet de vous contacter si nécessaire et de vérifier l\'authenticité des signalements.',
    },
    {
      question: 'Comment créer un signalement anonyme ?',
      answer: 'L\'anonymat est automatique ! Il vous suffit de créer un compte et de publier votre signalement. Votre identité ne sera jamais révélée publiquement.',
    },
    {
      question: 'Les commentaires sont-ils aussi anonymes ?',
      answer: 'Oui, tous les commentaires apparaissent sous le nom "Utilisateur anonyme". Personne ne peut savoir qui a commenté.',
    },
    {
      question: 'Que faire si je veux témoigner ?',
      answer: 'Vous pouvez ajouter un témoignage sur n\'importe quel signalement. Comme pour tout le reste, votre témoignage sera anonyme.',
    },
    {
      question: 'Comment sont traités les signalements ?',
      answer: 'Chaque signalement est examiné par notre équipe de modération. Une fois approuvé, il devient visible publiquement (toujours de manière anonyme).',
    },
  ];

  const guidelines = [
    {
      title: 'Respect et vérité',
      description: 'Ne publiez que des informations véridiques. Les fausses accusations sont interdites.',
    },
    {
      title: 'Protection des victimes',
      description: 'Ne mentionnez pas de noms de victimes ou de témoins vulnérables.',
    },
    {
      title: 'Preuves et documents',
      description: 'Ajoutez des photos, vidéos ou documents pour étayer votre signalement.',
    },
    {
      title: 'Pas de discours haineux',
      description: 'Aucun contenu discriminatoire, raciste ou haineux ne sera toléré.',
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-r from-red-50 to-red-100 rounded-3xl">
        <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Informations et <span className="text-red-600">Ressources</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Tout ce que vous devez savoir sur Dénonciation, notre mission, et comment nous protégeons votre anonymat.
        </p>
      </section>

      {/* Anonymat - Section mise en avant */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-12 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <Lock className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Votre anonymat est notre priorité</h2>
          <p className="text-lg text-gray-300 leading-relaxed mb-6">
            Sur Dénonciation, <span className="text-white font-semibold">votre identité est totalement protégée</span>. 
            Tous les signalements, commentaires, témoignages, likes et partages apparaissent sous le pseudonyme 
            <span className="text-green-400 font-semibold"> "Utilisateur anonyme"</span>. 
            Seuls les administrateurs de la plateforme ont accès à votre véritable identité, et uniquement 
            pour traiter les signalements et vous contacter si nécessaire.
          </p>
          <div className="bg-white/10 rounded-lg p-4 inline-block">
            <p className="text-sm">
              ✅ Votre nom n'apparaît jamais publiquement<br />
              ✅ Vos commentaires sont anonymes<br />
              ✅ Vos témoignages sont confidentiels<br />
              ✅ Seuls les administrateurs voient votre identité
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white rounded-2xl shadow p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <stat.icon className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission et Valeurs */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-12">Notre Mission et Nos Valeurs</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <value.icon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-gray-50 rounded-2xl p-12">
        <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Créez un compte',
              description: 'Inscrivez-vous gratuitement. Votre identité est vérifiée mais jamais révélée.',
            },
            {
              step: '02',
              title: 'Signalez un abus',
              description: 'Décrivez la situation, ajoutez des preuves. Tout est anonyme.',
            },
            {
              step: '03',
              title: 'Suivez l\'évolution',
              description: 'Notre équipe examine votre signalement. Vous êtes notifié de son statut.',
            },
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="text-5xl font-bold text-red-200 mb-4">{item.step}</div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Règles et bonnes pratiques */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-8">Règles et bonnes pratiques</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {guidelines.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 flex items-start space-x-4">
              <FileText className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-8">Questions fréquentes</h2>
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
              >
                <span className="font-medium text-gray-900">{item.question}</span>
                {openFaq === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {openFaq === index && (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <p className="text-gray-700">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Vous avez d'autres questions ?</h2>
        <p className="text-gray-600 mb-6">
          Notre équipe est là pour vous aider en toute confidentialité
        </p>
        <Link
          to="/contact"
          className="btn-primary inline-flex items-center space-x-2"
        >
          <Mail className="w-4 h-4" />
          <span>Nous contacter</span>
        </Link>
      </section>
    </div>
  );
}