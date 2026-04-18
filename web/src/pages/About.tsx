import { Shield, Users, Eye, Globe, Award, Heart } from 'lucide-react';

export default function About() {
  const stats = [
    { icon: Users, value: '10,000+', label: 'Utilisateurs' },
    { icon: Eye, value: '5,000+', label: 'Signalements' },
    { icon: Globe, value: '20+', label: 'Pays' },
    { icon: Award, value: '89%', label: 'Taux de résolution' },
  ];

  const values = [
    {
      icon: Shield,
      title: 'Protection',
      description: 'Nous protégeons l\'identité des lanceurs d\'alerte et des victimes.',
    },
    {
      icon: Heart,
      title: 'Solidarité',
      description: 'Nous croyons en la force collective pour dénoncer les injustices.',
    },
    {
      icon: Eye,
      title: 'Transparence',
      description: 'Nous nous engageons à traiter chaque signalement avec transparence.',
    },
  ];

  const team = [
    { name: 'Jean Mutombo', role: 'Fondateur & CEO', image: null },
    { name: 'Marie Kabila', role: 'Directrice des opérations', image: null },
    { name: 'Pierre Lumbi', role: 'Responsable technique', image: null },
    { name: 'Sophie Mboyo', role: 'Responsable juridique', image: null },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          À propos de <span className="text-red-600">Dénonciation</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Une plateforme citoyenne dédiée à la lutte contre les abus et les injustices.
          Notre mission est de donner une voix à ceux qui n'en ont pas.
        </p>
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

      {/* Mission */}
      <section className="bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-12">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Notre Mission</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Dénonciation est née de la volonté de créer un espace sûr où chaque citoyen peut
            signaler des abus sans crainte de représailles. Nous croyons que la transparence
            et la solidarité sont essentielles pour construire une société plus juste.
          </p>
        </div>
      </section>

      {/* Values */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-12">Nos Valeurs</h2>
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

      {/* How it works */}
      <section className="bg-gray-50 rounded-2xl p-12">
        <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Signalez',
              description: 'Décrivez la situation dont vous avez été témoin, ajoutez des preuves.',
            },
            {
              step: '02',
              title: 'Vérification',
              description: 'Notre équipe vérifie les informations et valide le signalement.',
            },
            {
              step: '03',
              title: 'Action',
              description: 'Le signalement est rendu public et des actions sont entreprises.',
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

      {/* Team */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-12">Notre Équipe</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {team.map((member, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-6 text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-400">
                  {member.name.charAt(0)}
                </span>
              </div>
              <h3 className="font-bold">{member.name}</h3>
              <p className="text-sm text-gray-600">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Vous avez des questions ?</h2>
        <p className="text-gray-600 mb-6">
          Notre équipe est là pour vous aider
        </p>
        <a
          href="mailto:contact@denonciation.com"
          className="btn-primary inline-flex items-center space-x-2"
        >
          <span>Nous contacter</span>
        </a>
      </section>
    </div>
  );
}