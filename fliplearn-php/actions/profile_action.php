<?php
session_start();
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user_id'])) {
    header('Location: ../index.php');
    exit;
}

if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
    header('Location: ../index.php?page=profile');
    exit;
}

$db = getDB();
$userId = $_SESSION['user_id'];

$nom = trim($_POST['nom'] ?? '');
$prenom = trim($_POST['prenom'] ?? '');
$email = trim($_POST['email'] ?? '');
$filiere = trim($_POST['filiere'] ?? '');
$promotion = trim($_POST['promotion'] ?? '');
$currentPass = $_POST['current_password'] ?? '';
$newPass = $_POST['new_password'] ?? '';

if (empty($nom) || empty($prenom) || empty($email)) {
    header('Location: ../index.php?page=profile&error=' . urlencode('Nom, pr&eacute;nom et email sont obligatoires.'));
    exit;
}

// Verifier unicite email
$stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
$stmt->execute([$email, $userId]);
if ($stmt->fetch()) {
    header('Location: ../index.php?page=profile&error=' . urlencode('Cet email est d&eacute;j&agrave; utilis&eacute;.'));
    exit;
}

// Mettre a jour les infos
$stmt = $db->prepare("UPDATE users SET nom = ?, prenom = ?, email = ?, filiere = ?, promotion = ? WHERE id = ?");
$stmt->execute([$nom, $prenom, $email, $filiere, $promotion, $userId]);

// Mettre a jour la session
$_SESSION['nom'] = $nom;
$_SESSION['prenom'] = $prenom;
$_SESSION['email'] = $email;

// Changement de mot de passe si demande
if (!empty($currentPass) && !empty($newPass)) {
    $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!password_verify($currentPass, $user['password'])) {
        header('Location: ../index.php?page=profile&error=' . urlencode('Mot de passe actuel incorrect.'));
        exit;
    }

    if (strlen($newPass) < 6) {
        header('Location: ../index.php?page=profile&error=' . urlencode('Le nouveau mot de passe doit contenir au moins 6 caract&egrave;res.'));
        exit;
    }

    $hashed = password_hash($newPass, PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashed, $userId]);
}

header('Location: ../index.php?page=profile&success=' . urlencode('Profil mis &agrave; jour avec succ&egrave;s.'));
exit;
