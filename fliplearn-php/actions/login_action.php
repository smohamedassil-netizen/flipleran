<?php
session_start();
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php?page=login');
    exit;
}

// Verification CSRF
if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
    header('Location: ../index.php?page=login&error=' . urlencode('Session expir&eacute;e, veuillez r&eacute;essayer.'));
    exit;
}

$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

if (empty($email) || empty($password)) {
    header('Location: ../index.php?page=login&error=' . urlencode('Veuillez remplir tous les champs.'));
    exit;
}

$db = getDB();
$stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND is_active = 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    header('Location: ../index.php?page=login&error=' . urlencode('Email ou mot de passe incorrect.'));
    exit;
}

// Connexion reussie : creation de la session
$_SESSION['user_id'] = $user['id'];
$_SESSION['role'] = $user['role'];
$_SESSION['nom'] = $user['nom'];
$_SESSION['prenom'] = $user['prenom'];
$_SESSION['email'] = $user['email'];

// Regenerer l'ID de session pour eviter le fixation
session_regenerate_id(true);

header('Location: ../index.php?page=dashboard');
exit;
