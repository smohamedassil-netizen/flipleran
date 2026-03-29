<?php
/**
 * Script de seed - Cree les donnees de test
 * Utilisation : php seed.php
 *
 * Prerequis : base "fliplearn" deja creee via sql/schema.sql
 */

require_once 'config/database.php';

$db = getDB();

echo "=== FlipLearn - Seed des donnees de test ===\n\n";

// Vider les tables (dans l'ordre des FK)
$tables = ['student_answers', 'qcm_results', 'questions', 'qcms', 'videos', 'courses', 'users'];
foreach ($tables as $t) {
    $db->exec("DELETE FROM $t");
    $db->exec("ALTER TABLE $t AUTO_INCREMENT = 1");
}
echo "Tables videes.\n";

// === UTILISATEURS ===
$users = [
    ['Admin', 'FlipLearn', 'admin@fliplearn.dz', 'admin1234', 'admin', '', ''],
    ['Benali', 'Karim', 'karim.prof@fliplearn.dz', 'prof1234', 'professeur', 'Informatique', ''],
    ['Hadj', 'Sara', 'sara.prof@fliplearn.dz', 'prof1234', 'professeur', 'Informatique', ''],
    ['Meziane', 'Amine', 'amine@fliplearn.dz', 'etudiant123', 'etudiant', 'Informatique', 'L3 2024-2025'],
    ['Bouzid', 'Yasmine', 'yasmine@fliplearn.dz', 'etudiant123', 'etudiant', 'Informatique', 'L3 2024-2025'],
    ['Rahmani', 'Sofiane', 'sofiane@fliplearn.dz', 'etudiant123', 'etudiant', 'Informatique', 'L3 2024-2025'],
    ['Khelifi', 'Nadia', 'nadia@fliplearn.dz', 'etudiant123', 'etudiant', 'Mathematiques', 'L3 2024-2025'],
];

$stmt = $db->prepare("INSERT INTO users (nom, prenom, email, password, role, filiere, promotion) VALUES (?, ?, ?, ?, ?, ?, ?)");
foreach ($users as $u) {
    $hashed = password_hash($u[3], PASSWORD_DEFAULT);
    $stmt->execute([$u[0], $u[1], $u[2], $hashed, $u[4], $u[5], $u[6]]);
}
echo count($users) . " utilisateurs crees.\n";

// === COURS ===
$courses = [
    ['Introduction aux Bases de Donnees', 'Cours sur les fondamentaux des bases de donnees relationnelles : SQL, normalisation, conception.', 2, 'Informatique', 'L3 2024-2025'],
    ['Programmation Web - PHP/MySQL', 'Developpement web cote serveur avec PHP et MySQL. MVC, sessions, securite.', 2, 'Informatique', 'L3 2024-2025'],
    ['Algorithmique Avancee', 'Structures de donnees avancees, complexite, graphes, programmation dynamique.', 3, 'Informatique', 'L3 2024-2025'],
];

$stmt = $db->prepare("INSERT INTO courses (titre, description, professor_id, filiere, promotion) VALUES (?, ?, ?, ?, ?)");
foreach ($courses as $c) {
    $stmt->execute($c);
}
echo count($courses) . " cours crees.\n";

// === VIDEOS ===
$videos = [
    ['Introduction au SQL', '', 'https://www.youtube.com/watch?v=7S_tz1z_5bA', 1, 2, 1],
    ['Les jointures SQL', '', 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw', 1, 2, 2],
    ['PHP pour les debutants', '', 'https://www.youtube.com/watch?v=OK_JCtrrv-c', 2, 2, 1],
    ['PHP et MySQL - CRUD', '', 'https://www.youtube.com/watch?v=y2b70MFWJMo', 2, 2, 2],
    ['Les algorithmes de tri', '', 'https://www.youtube.com/watch?v=kPRA0W1kECg', 3, 3, 1],
];

$stmt = $db->prepare("INSERT INTO videos (titre, description, youtube_url, course_id, created_by, position) VALUES (?, ?, ?, ?, ?, ?)");
foreach ($videos as $v) {
    $stmt->execute($v);
}
echo count($videos) . " videos creees.\n";

// === QCMs + QUESTIONS ===
// QCM 1 : SQL
$db->exec("INSERT INTO qcms (titre, course_id, points_per_question, timer_seconds) VALUES ('Quiz SQL - Les bases', 1, 10, 30)");
$qcm1 = $db->lastInsertId();

$questions1 = [
    ['Quelle commande SQL permet de recuperer des donnees ?', 'INSERT', 'SELECT', 'UPDATE', 'DELETE', 'B', 'SELECT est la commande de lecture en SQL.'],
    ['Quel mot-cle permet de filtrer les resultats ?', 'ORDER BY', 'GROUP BY', 'WHERE', 'HAVING', 'C', 'WHERE filtre les lignes avant le GROUP BY.'],
    ['Quelle commande cree une nouvelle table ?', 'CREATE TABLE', 'NEW TABLE', 'ADD TABLE', 'MAKE TABLE', 'A', 'CREATE TABLE est la syntaxe DDL standard.'],
    ['Comment trier les resultats par ordre decroissant ?', 'SORT DESC', 'ORDER BY ... DESC', 'DESCENDING', 'REVERSE ORDER', 'B', 'ORDER BY colonne DESC trie en ordre decroissant.'],
    ['Quelle jointure retourne toutes les lignes des deux tables ?', 'INNER JOIN', 'LEFT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN', 'C', 'FULL OUTER JOIN combine LEFT et RIGHT JOIN.'],
];

$stmt = $db->prepare("INSERT INTO questions (qcm_id, texte, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
foreach ($questions1 as $q) {
    $stmt->execute(array_merge([$qcm1], $q));
}

// QCM 2 : PHP
$db->exec("INSERT INTO qcms (titre, course_id, points_per_question, timer_seconds) VALUES ('Quiz PHP - Les fondamentaux', 2, 10, 30)");
$qcm2 = $db->lastInsertId();

$questions2 = [
    ['Comment demarre-t-on un bloc PHP ?', '<?php', '<php>', '<?>', '<script php>', 'A', '<?php est la balise d\'ouverture standard.'],
    ['Quel superglobal contient les donnees POST ?', '$_GET', '$_POST', '$_REQUEST', '$_DATA', 'B', '$_POST contient les donnees envoyees par methode POST.'],
    ['Comment connecter PHP a MySQL de maniere securisee ?', 'mysql_connect()', 'mysqli_connect()', 'PDO', 'db_connect()', 'C', 'PDO est recommande pour la securite et la portabilite.'],
    ['Quelle fonction hashe un mot de passe en PHP ?', 'md5()', 'sha1()', 'password_hash()', 'crypt()', 'C', 'password_hash() utilise bcrypt par defaut.'],
    ['Comment prevenir les injections SQL ?', 'htmlspecialchars()', 'Requetes preparees', 'addslashes()', 'strip_tags()', 'B', 'Les requetes preparees (prepared statements) empechent les injections SQL.'],
];

foreach ($questions2 as $q) {
    $stmt->execute(array_merge([$qcm2], $q));
}

echo "2 QCMs avec " . (count($questions1) + count($questions2)) . " questions crees.\n";

// Donner des points a quelques etudiants
$db->exec("UPDATE users SET points = 80 WHERE email = 'amine@fliplearn.dz'");
$db->exec("UPDATE users SET points = 60 WHERE email = 'yasmine@fliplearn.dz'");
$db->exec("UPDATE users SET points = 40 WHERE email = 'sofiane@fliplearn.dz'");

echo "\n=== Seed termine avec succes ! ===\n";
echo "\nComptes de test :\n";
echo "  Admin     : admin@fliplearn.dz / admin1234\n";
echo "  Prof      : karim.prof@fliplearn.dz / prof1234\n";
echo "  Etudiant  : amine@fliplearn.dz / etudiant123\n";
