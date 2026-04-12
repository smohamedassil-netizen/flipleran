# DOCUMENT 4 — L'AGENT IA (CHATBOT ET GENERATION DE QCM)

## 4.1 Vue d'ensemble

L'application integre un **agent d'intelligence artificielle** qui remplit deux fonctions :

1. **Chatbot pedagogique** : l'etudiant peut poser des questions sur ses cours et recevoir des explications en temps reel
2. **Generateur de QCM** : le professeur peut generer automatiquement des questions de quiz a partir du titre d'un cours

L'IA utilisee est le modele **Llama 3.3 70B** (cree par Meta, open source) accessible via l'API **Groq** (gratuite).

---

## 4.2 Pourquoi Groq et Llama 3.3 ?

| Critere | OpenAI (GPT-4) | Groq (Llama 3.3) | Notre choix |
|---|---|---|---|
| **Cout** | Payant (~0.03$/requete) | Gratuit | Groq |
| **Vitesse** | ~2-5 secondes | ~0.5-1 seconde | Groq est plus rapide |
| **Qualite** | Excellente | Tres bonne | Suffisante pour notre usage |
| **Modele** | Proprietaire (ferme) | Open source (Meta) | Avantage ethique |
| **Limite** | Pas de limite (si on paye) | ~30 requetes/minute | Suffisant pour un projet etudiant |

---

## 4.3 Le chatbot — Explication detaillee

### Fichier : `backend/services/chatbot.js`

### Etape 1 : Initialisation du client Groq

```javascript
import Groq from 'groq-sdk';

let groq;
function getGroq() {
    if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    return groq;
}
```

On utilise un **singleton** : le client Groq n'est cree qu'une seule fois, puis reutilise. La cle API est dans le fichier `.env`.

### Etape 2 : Le prompt systeme

```javascript
const SYSTEM_PROMPT = `Tu es un assistant pedagogique nomme "Assistant FlipLearn"
pour une universite algerienne.
Tu aides exclusivement les etudiants en informatique dans leurs apprentissages.
Regles absolues :
- Tu reponds TOUJOURS en francais, meme si on te parle en anglais ou en arabe.
- Tes reponses sont concises (max 4 paragraphes), structurees et pedagogiques.
- Si une question n'est pas liee aux etudes, decline poliment et recentre la conversation.
- Si tu ne connais pas la reponse avec certitude, dis-le et oriente vers le professeur.
- Utilise des exemples concrets et du code quand c'est pertinent.
- Ne genere jamais de contenu inapproprie.`;
```

**Qu'est-ce qu'un prompt systeme ?**
C'est une instruction donnee a l'IA **avant** la question de l'utilisateur. L'IA doit toujours respecter ces regles. C'est comme donner un cahier des charges a un employe avant qu'il commence a travailler.

**Pourquoi ces regles ?**
- Repondre en francais : l'application cible un public francophone
- Max 4 paragraphes : eviter les reponses trop longues
- Refuser les questions hors sujet : l'IA doit rester pedagogique
- Orienter vers le professeur si incertain : eviter la desinformation

### Etape 3 : La fonction principale `askBot()`

```javascript
export async function askBot(userMessage, history = []) {
    // 1. Construire le contexte conversationnel (8 derniers echanges)
    const contextMessages = history
        .slice(-8)
        .map((m) => ({
            role: m.type === 'bot' ? 'assistant' : 'user',
            content: String(m.content),
        }));

    // 2. Assembler les messages pour l'API
    const messages = [
        { role: 'system',    content: SYSTEM_PROMPT },  // Instructions
        ...contextMessages,                              // Historique
        { role: 'user',      content: userMessage },     // Question actuelle
    ];

    // 3. Appeler l'API Groq
    const completion = await getGroq().chat.completions.create({
        model:       'llama-3.3-70b-versatile',
        messages,
        max_tokens:  600,         // Limite la longueur de la reponse
        temperature: 0.7,         // Creativite moderee (0=deterministe, 1=tres creatif)
        top_p:       0.9,         // Filtre les reponses les moins probables
    });

    // 4. Extraire et retourner la reponse
    return completion.choices[0]?.message?.content?.trim();
}
```

**Explication des parametres :**
- `model: 'llama-3.3-70b-versatile'` : le modele Llama 3.3 avec 70 milliards de parametres. "Versatile" signifie qu'il est bon pour tout type de tache
- `max_tokens: 600` : limite la reponse a ~600 mots (evite les reponses trop longues)
- `temperature: 0.7` : a 0, l'IA donne toujours la meme reponse. A 1, elle est tres creative. 0.7 est un bon equilibre pour des reponses pedagogiques
- `top_p: 0.9` : l'IA ne considere que les 90% de mots les plus probables, eliminant les reponses absurdes

**Pourquoi l'historique est important ?**
Sans historique, chaque question est independante. Avec l'historique (les 8 derniers messages), l'IA peut :
- Comprendre le contexte ("quand je dis 'ca', je parle de SQL")
- Faire des references aux questions precedentes
- Construire une explication progressive

### Etape 4 : Gestion des erreurs

```javascript
const FALLBACK_RESPONSES = [
    "Je rencontre un probleme technique. Veuillez reessayer.",
    "Mon service est temporairement indisponible.",
];

// Si l'API echoue, on renvoie un message d'erreur au lieu de planter
try {
    const completion = await getGroq().chat.completions.create({...});
    return completion.choices[0]?.message?.content;
} catch (err) {
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}
```

---

## 4.4 La generation de QCM par IA

### Fonction `generateQuizQuestions()`

```javascript
export async function generateQuizQuestions(topic, description = '', count = 5) {
    const userPrompt = `Genere exactement ${count} questions QCM sur le sujet :
    Sujet : "${topic}"
    ${description ? `Description : "${description}"` : ''}

    Retourne UNIQUEMENT un JSON valide avec cette structure :
    {
        "questions": [
            {
                "texte": "La question ici ?",
                "options": { "A": "option A", "B": "option B", "C": "option C", "D": "option D" },
                "correctAnswer": "B",
                "questionType": "single",
                "explanation": "Explication de la bonne reponse"
            }
        ]
    }`;

    const completion = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: QCM_SYSTEM_PROMPT },
            { role: 'user',   content: userPrompt },
        ],
        max_tokens: 2000,       // Plus long car on genere plusieurs questions
        temperature: 0.6,       // Un peu moins creatif pour des QCM precis
    });

    // Extraire le JSON de la reponse (peut etre entoure de ```json ... ```)
    let jsonStr = completion.choices[0]?.message?.content;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    return parsed.questions;
}
```

**Le flux complet :**
```
1. Le professeur clique "Generer par IA" sur la page de creation de QCM
2. Le frontend envoie POST /api/chatbot/generate-qcm { topic: "Les bases de donnees SQL" }
3. Le controleur appelle generateQuizQuestions("Les bases de donnees SQL")
4. La fonction envoie un prompt a Groq : "Genere 5 questions QCM sur les bases de donnees SQL"
5. Groq/Llama 3.3 genere un JSON avec 5 questions, 4 options chacune, la reponse correcte et une explication
6. Le code parse le JSON et le renvoie au frontend
7. Le frontend pre-remplit le formulaire QCM avec les questions generees
8. Le professeur peut modifier les questions avant de sauvegarder
```

**Pourquoi le prof peut modifier ?**
L'IA peut faire des erreurs. Le professeur doit toujours valider et corriger les questions avant de les publier. C'est un outil d'aide, pas un remplacement du professeur.

---

## 4.5 Integration dans le chat (Socket.io)

### Fichier : `backend/server.js` (lignes 292-319)

Quand un message arrive dans une salle de chat qui commence par `bot_`, le serveur sait que c'est une conversation avec l'IA :

```javascript
socket.on('send_message', async ({ roomId, content }) => {
    // 1. Sauvegarder le message de l'etudiant en BDD
    const msg = await Message.create({ senderId: user.id, roomId, content });
    io.to(roomId).emit('receive_message', msg);

    // 2. Si c'est une salle bot → declencher l'IA
    if (roomId.startsWith('bot_')) {
        // Afficher "le bot reflechit..."
        io.to(roomId).emit('bot_thinking', true);

        // Charger l'historique pour le contexte (12 derniers messages)
        const history = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(12);

        // Appeler l'IA
        const aiText = await askBot(content, history);

        // Sauvegarder la reponse de l'IA en BDD
        const botMsg = await Message.create({
            roomId, content: aiText, type: 'bot', senderName: 'Assistant FlipLearn'
        });

        // Envoyer la reponse au client
        io.to(roomId).emit('bot_thinking', false);
        io.to(roomId).emit('receive_message', { ...botMsg.toObject(), senderId: BOT_SENDER });
    }
});
```

**Le flux en temps reel :**
```
Etudiant tape "C'est quoi une jointure SQL ?"
    ↓
Socket.io envoie au serveur
    ↓
Serveur sauvegarde le message en BDD
    ↓
Serveur emet 'bot_thinking' = true (le frontend affiche "...")
    ↓
Serveur appelle askBot() → API Groq → Llama 3.3 genere la reponse
    ↓
Serveur sauvegarde la reponse en BDD
    ↓
Serveur emet 'bot_thinking' = false + 'receive_message' avec la reponse
    ↓
Le frontend affiche la reponse de l'IA dans le chat
```
