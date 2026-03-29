# FlipLearn PHP - Classe Inversee

Application web de classe inversee en **PHP/MySQL/HTML/CSS/JS vanilla**.
Projet de niveau L3 Informatique.

## Stack technique

- **Backend** : PHP 8+ (vanilla, sans framework)
- **Base de donnees** : MySQL 8+ (via PDO)
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Serveur local** : XAMPP, WAMP, MAMP, ou `php -S localhost:8000`

## Installation

### 1. Prerequis

- PHP 8.0+ avec extensions `pdo_mysql`, `mbstring`
- MySQL 8.0+ (ou MariaDB 10+)
- Un serveur local (XAMPP/WAMP) ou PHP built-in server

### 2. Base de donnees

```bash
# Connectez-vous a MySQL
mysql -u root -p

# Executez le schema
source sql/schema.sql;
```

### 3. Configuration

Editez `config/database.php` si besoin :
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'fliplearn');
define('DB_USER', 'root');
define('DB_PASS', '');  // Votre mot de passe MySQL
```

### 4. Donnees de test

```bash
php seed.php
```

### 5. Lancer le serveur

```bash
# Option 1 : PHP built-in server
php -S localhost:8000

# Option 2 : Placer dans htdocs (XAMPP) ou www (WAMP)
# Puis ouvrir http://localhost/fliplearn-php/
```

## Comptes de test

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@fliplearn.dz | admin1234 |
| Professeur | karim.prof@fliplearn.dz | prof1234 |
| Etudiant | amine@fliplearn.dz | etudiant123 |

## Structure du projet

```
fliplearn-php/
├── index.php              # Routeur principal (front controller)
├── config/database.php    # Connexion PDO MySQL
├── includes/              # Composants reutilisables
│   ├── header.php         # En-tete HTML + navbar
│   ├── footer.php         # Pied de page
│   ├── auth_check.php     # Verification session
│   └── role_check.php     # Verification role
├── pages/                 # Pages de l'application
│   ├── login.php
│   ├── register.php
│   ├── dashboard*.php     # Tableaux de bord par role
│   ├── courses.php        # Liste des cours
│   ├── course_detail.php  # Detail d'un cours
│   ├── course_form.php    # Creer/modifier un cours
│   ├── video_form.php     # Ajouter une video YouTube
│   ├── qcm_form.php       # Creer un QCM
│   ├── qcm_take.php       # Passer un QCM
│   ├── qcm_result.php     # Resultats + corrections
│   ├── leaderboard.php    # Classement
│   ├── admin_users.php    # Gestion utilisateurs
│   └── profile.php        # Profil
├── actions/               # Traitement des formulaires (POST)
├── assets/
│   ├── css/style.css      # Styles complets
│   └── js/
│       ├── main.js        # JS global
│       └── qcm.js         # Moteur de quiz
├── sql/schema.sql         # Schema de la BDD
└── seed.php               # Donnees de demonstration
```

## Fonctionnalites

- **Authentification** : inscription, connexion, sessions PHP, CSRF protection
- **3 roles** : etudiant, professeur, admin
- **Cours** : CRUD par le professeur
- **Videos YouTube** : integration iframe dans les cours
- **QCM** : creation dynamique, timer par question, correction automatique
- **Gamification** : points par QCM reussi, classement
- **Admin** : gestion des utilisateurs (activer/desactiver/supprimer)

## Securite

- Mots de passe hashes avec `password_hash()` (bcrypt)
- Requetes preparees PDO (anti-injection SQL)
- `htmlspecialchars()` sur toutes les sorties (anti-XSS)
- Token CSRF sur tous les formulaires
- Whitelist de pages dans le routeur (anti-inclusion de fichier)

## Ajouter l'IA plus tard

Pour integrer un chatbot IA dans cette stack PHP :

### Option 1 : API OpenAI (recommande)
```php
// Appel simple avec cURL depuis PHP
$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . OPENAI_API_KEY
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'gpt-4o-mini',
    'messages' => [['role' => 'user', 'content' => $question]]
]));
$response = json_decode(curl_exec($ch), true);
```

### Option 2 : API Groq (gratuit, rapide)
Meme principe avec `https://api.groq.com/openai/v1/chat/completions`
et le modele `llama-3.3-70b-versatile`.

### Option 3 : Ollama (100% local, gratuit)
Installer Ollama, puis appeler `http://localhost:11434/api/chat` depuis PHP.
