<?php
session_start();
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php?page=register');
    exit;
}

// Verification CSRF
if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
    header('Location: ../index.php?page=register&error=' . urlencode('Session expir&eacute;e, veuillez r&eacute;essayer.'));
    exit;
}

$nom = trim($_POST['nom'] ?? '');
$prenom = trim($_POST['prenom'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$role = $_POST['role'] ?? 'etudiant';
$filiere = trim($_POST['filiere'] ?? '');
$promotion = trim($_POST['promotion'] ?? '');

// Validation
if (empty($nom) || empty($prenom) || empty($email) || empty($password)) {
    header('Location: ../index.php?page=register&error=' . urlencode('Veuillez remplir tous les champs obligatoires.'));
    exit;
}

if (strlen($password) < 6) {
    header('Location: ../index.php?page=register&error=' . urlencode('Le mot de passe doit contenir au moins 6 caract&egrave;res.'));
    exit;
}

// Seuls etudiant et professeur peuvent s'inscrire
if (!in_array($role, ['etudiant', 'professeur'])) {
    $role = 'etudiant';
}

$db = getDB();

// Verifier si l'email existe deja
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    header('Location: ../index.php?page=register&error=' . urlencode('Cet email est d&eacute;j&agrave; utilis&eacute;.'));
    exit;
}

// Hasher le mot de passe
$hashed = password_hash($password, PASSWORD_DEFAULT);

// Inserer l'utilisateur
$stmt = $db->prepare("INSERT INTO users (nom, prenom, email, password, role, filiere, promotion) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->execute([$nom, $prenom, $email, $hashed, $role, $filiere, $promotion]);

$userId = $db->lastInsertId();

// Auto-login
$_SESSION['user_id'] = $userId;
$_SESSION['role'] = $role;
$_SESSION['nom'] = $nom;
$_SESSION['prenom'] = $prenom;
$_SESSION['email'] = $email;

session_regenerate_id(true);

header('Location: ../index.php?page=dashboard');
exit;
