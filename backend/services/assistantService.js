const { OpenAI } = require('openai');

class AssistantService {
    constructor() {
        this.openai = null;
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            console.log('✅ OpenAI API initialisée');
        } else {
            console.warn('⚠️ OpenAI API non configurée. L\'assistant utilisera des réponses prédéfinies.');
        }
    }

    getFallbackAnswer(question, language) {
        const lower = question.toLowerCase();
        if (language === 'fr') {
            if (lower.includes('signalement') || lower.includes('comment signaler')) {
                return "Pour créer un signalement, cliquez sur 'Nouveau signalement' dans le menu principal. Vous devrez fournir un titre, une description, choisir une catégorie d'abus, et vous pouvez ajouter des preuves (photos, vidéos, PDF). N'oubliez pas de publier votre signalement pour qu'il soit visible par la communauté.";
            }
            if (lower.includes('témoignage') || lower.includes('œil')) {
                return "Le bouton œil (témoignage) vous permet de confirmer que vous avez été témoin d'un incident signalé. Votre témoignage aide à renforcer la crédibilité du signalement et soutient la personne qui a partagé l'information.";
            }
            if (lower.includes('live') || lower.includes('direct')) {
                return "Les lives sont des diffusions en direct. Vous pouvez créer un live si vous êtes un utilisateur premium. Les lives premium peuvent inclure des émissions sécuritaires, sanitaires, économiques, sportives, des podcasts, des communiqués, des divertissements et des publicités.";
            }
            if (lower.includes('modération') || lower.includes('message supprimé')) {
                return "Notre système de modération automatique filtre les messages contenant des insultes, du contenu discriminatoire ou toxique. Si votre message a été rejeté, veuillez reformuler votre propos de manière respectueuse.";
            }
            if (lower.includes('compte') || lower.includes('supprimer')) {
                return "Pour supprimer votre compte, allez dans Paramètres > Supprimer mon compte. Cette action est irréversible et supprimera tous vos signalements, commentaires et interactions.";
            }
            return "Je suis l'assistant de la plateforme Dénonciation. Je peux vous aider à créer des signalements, comprendre le fonctionnement des lives, ou répondre à vos questions sur les règles d'utilisation. Quelle est votre question ?";
        } else {
            if (lower.includes('report') || lower.includes('how to report')) {
                return "To create a report, click on 'New report' in the main menu. You will need to provide a title, description, choose an abuse category, and you can add evidence (photos, videos, PDF). Don't forget to publish your report so it's visible to the community.";
            }
            if (lower.includes('witness') || lower.includes('eye')) {
                return "The eye button (witness) allows you to confirm that you witnessed a reported incident. Your testimony helps strengthen the credibility of the report and supports the person who shared the information.";
            }
            if (lower.includes('live') || lower.includes('stream')) {
                return "Lives are live broadcasts. You can create a live if you are a premium user. Premium lives can include security, health, economic, sports broadcasts, podcasts, press releases, entertainment, and advertisements.";
            }
            if (lower.includes('moderation') || lower.includes('message rejected')) {
                return "Our automatic moderation system filters messages containing insults, discriminatory or toxic content. If your message was rejected, please rephrase it respectfully.";
            }
            if (lower.includes('account') || lower.includes('delete')) {
                return "To delete your account, go to Settings > Delete my account. This action is irreversible and will delete all your reports, comments, and interactions.";
            }
            return "I am the assistant for the Denonciation platform. I can help you create reports, understand how live streams work, or answer your questions about the terms of use. What is your question?";
        }
    }

    async askOpenAI(question, language) {
        try {
            const systemMessage = language === 'fr'
                ? `Tu es un assistant pour la plateforme "Dénonciation", une application de signalement d'abus. Réponds en français, de manière concise et utile.`
                : `You are an assistant for the "Denonciation" platform, an abuse reporting application. Answer in English concisely and helpfully.`;
            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: question }
                ],
                max_tokens: 500,
                temperature: 0.7
            });
            return completion.choices[0].message.content;
        } catch (err) {
            console.error('Erreur OpenAI:', err.message);
            return this.getFallbackAnswer(question, language);
        }
    }

    async ask(question, language = 'fr') {
        if (!question || question.trim().length < 3) {
            return language === 'fr' ? "Veuillez poser une question plus précise pour que je puisse vous aider." : "Please ask a more specific question so I can help you.";
        }
        if (this.openai) return await this.askOpenAI(question, language);
        else return this.getFallbackAnswer(question, language);
    }
}

module.exports = new AssistantService();