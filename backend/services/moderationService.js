const Filter = require('bad-words');

const filter = new Filter({ placeHolder: '***' });

const forbiddenWords = [
    'cadavre', 'meurtre', 'assassinat', 'décapitation', 'barbare', 'brutal', 'sang', 'corps sans vie',
    'nudité', 'nu', 'sexy', 'sexe', 'porn', 'porno', 'nue', 'dénudé',
    'homophobe', 'homophobie', 'raciste', 'racisme', 'discrimination', 'intolérant', 'nazi', 'fasciste',
    'fanatique', 'extrémiste', 'antisémite', 'islamophobe'
];
filter.addWords(...forbiddenWords);

class ModerationService {
    async moderateText(text) {
        let cleanedText = filter.clean(text);
        let isClean = cleanedText === text;
        let reason = null;
        if (!isClean) reason = 'Contient des mots interdits';
        const violenceRegex = /(cadavre|meurtre|assassinat|décapitation|brutal|barbare|corps sans vie)/i;
        const nudityRegex = /(nudité|nu|sexy|sexe|porn|porno|nue|dénudé)/i;
        const hateRegex = /(homophobe|raciste|nazi|fasciste|discrimination|intolérant|fanatique|extrémiste|antisémite|islamophobe)/i;
        if (violenceRegex.test(text)) { isClean = false; reason = 'Contenu violent interdit'; }
        if (nudityRegex.test(text)) { isClean = false; reason = 'Contenu obscène interdit'; }
        if (hateRegex.test(text)) { isClean = false; reason = 'Discours haineux interdit'; }
        return { isClean, cleanedText, reason };
    }

    async moderateImage(imageUrl) {
        return { isClean: true, reason: null };
    }

    async moderateReport(titre, description) {
        const titreResult = await this.moderateText(titre);
        const descResult = await this.moderateText(description);
        const issues = [];
        if (!titreResult.isClean) issues.push(`Titre: ${titreResult.reason}`);
        if (!descResult.isClean) issues.push(`Description: ${descResult.reason}`);
        return { isClean: issues.length === 0, issues, cleanedTitre: titreResult.cleanedText, cleanedDescription: descResult.cleanedText };
    }
}

module.exports = new ModerationService();