import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
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
} from 'lucide-react-native';

interface FAQItem {
  question: string;
  answer: string;
}

export default function InformationScreen() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  const steps = [
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
  ];

  const handleContact = () => {
    Linking.openURL('mailto:contact@denonciation.com');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Shield color="#EF4444" size={48} />
        <Text style={styles.heroTitle}>Informations et Ressources</Text>
        <Text style={styles.heroSubtitle}>
          Tout ce que vous devez savoir sur Dénonciation, notre mission, et comment nous protégeons votre anonymat.
        </Text>
      </View>

      {/* Anonymat - Section mise en avant */}
      <View style={styles.anonymatSection}>
        <Lock color="#10B981" size={32} />
        <Text style={styles.anonymatTitle}>Votre anonymat est notre priorité</Text>
        <Text style={styles.anonymatText}>
          Sur Dénonciation, votre identité est totalement protégée. Tous les signalements, commentaires, 
          témoignages, likes et partages apparaissent sous le pseudonyme "Utilisateur anonyme". 
          Seuls les administrateurs ont accès à votre véritable identité.
        </Text>
        <View style={styles.anonymatBadge}>
          <Text style={styles.anonymatBadgeText}>
            ✅ Votre nom n\'apparaît jamais publiquement{'\n'}
            ✅ Vos commentaires sont anonymes{'\n'}
            ✅ Vos témoignages sont confidentiels{'\n'}
            ✅ Seuls les administrateurs voient votre identité
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <stat.icon color="#EF4444" size={24} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Mission et Valeurs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notre Mission et Nos Valeurs</Text>
        {values.map((value, index) => (
          <View key={index} style={styles.valueItem}>
            <View style={styles.valueIcon}>
              <value.icon color="#EF4444" size={24} />
            </View>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>{value.title}</Text>
              <Text style={styles.valueDescription}>{value.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Comment ça marche */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
        <View style={styles.stepsContainer}>
          {steps.map((item, index) => (
            <View key={index} style={styles.stepItem}>
              <Text style={styles.stepNumber}>{item.step}</Text>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDescription}>{item.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Règles et bonnes pratiques */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Règles et bonnes pratiques</Text>
        {guidelines.map((item, index) => (
          <View key={index} style={styles.guidelineItem}>
            <FileText color="#EF4444" size={20} />
            <View style={styles.guidelineContent}>
              <Text style={styles.guidelineTitle}>{item.title}</Text>
              <Text style={styles.guidelineDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* FAQ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        {faqItems.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
            >
              <HelpCircle color="#666" size={18} />
              <Text style={styles.faqQuestion}>{item.question}</Text>
              {expandedFaq === index ? (
                <ChevronUp color="#999" size={18} />
              ) : (
                <ChevronDown color="#999" size={18} />
              )}
            </TouchableOpacity>
            {expandedFaq === index && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>{item.answer}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Contact CTA */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Vous avez d\'autres questions ?</Text>
        <Text style={styles.contactText}>
          Notre équipe est là pour vous aider en toute confidentialité
        </Text>
        <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
          <Mail color="#FFF" size={18} />
          <Text style={styles.contactButtonText}>Nous contacter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  hero: {
    backgroundColor: '#FFF',
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  anonymatSection: {
    backgroundColor: '#1F2937',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  anonymatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
    textAlign: 'center',
  },
  anonymatText: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  anonymatBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  anonymatBadgeText: {
    fontSize: 12,
    color: '#10B981',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  valueItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  valueIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  valueDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  stepsContainer: {
    marginTop: 8,
  },
  stepItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FCA5A5',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  guidelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  guidelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  guidelineDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  faqAnswer: {
    marginTop: 10,
    paddingLeft: 28,
  },
  faqAnswerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  contactText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
    gap: 8,
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});