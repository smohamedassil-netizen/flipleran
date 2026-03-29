<?php
// Generation du token CSRF si absent
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrf_token = $_SESSION['csrf_token'];

// Helper pour echapper le HTML
function e($str) {
    return htmlspecialchars($str ?? '', ENT_QUOTES, 'UTF-8');
}

// Helper pour extraire l'ID YouTube
function youtube_id($url) {
    $pattern = '/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/';
    if (preg_match($pattern, $url, $matches)) {
        return $matches[1];
    }
    return $url; // Retourne tel quel si c'est deja un ID
}

$is_logged = isset($_SESSION['user_id']);
$current_page = $_GET['page'] ?? '';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlipLearn - Classe Invers&eacute;e</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="navbar-brand">
            <a href="index.php">FlipLearn</a>
            <?php if ($is_logged): ?>
                <button class="menu-toggle" onclick="document.querySelector('.navbar-menu').classList.toggle('active')">&#9776;</button>
            <?php endif; ?>
        </div>
        <?php if ($is_logged): ?>
        <div class="navbar-menu">
            <?php if ($_SESSION['role'] === 'etudiant'): ?>
                <a href="index.php?page=dashboard" class="<?= $current_page === 'dashboard' ? 'active' : '' ?>">Tableau de bord</a>
                <a href="index.php?page=courses" class="<?= $current_page === 'courses' ? 'active' : '' ?>">Mes cours</a>
                <a href="index.php?page=leaderboard" class="<?= $current_page === 'leaderboard' ? 'active' : '' ?>">Classement</a>
            <?php elseif ($_SESSION['role'] === 'professeur'): ?>
                <a href="index.php?page=dashboard" class="<?= $current_page === 'dashboard' ? 'active' : '' ?>">Tableau de bord</a>
                <a href="index.php?page=courses" class="<?= $current_page === 'courses' ? 'active' : '' ?>">Mes cours</a>
                <a href="index.php?page=course_form" class="<?= $current_page === 'course_form' ? 'active' : '' ?>">Nouveau cours</a>
            <?php elseif ($_SESSION['role'] === 'admin'): ?>
                <a href="index.php?page=dashboard" class="<?= $current_page === 'dashboard' ? 'active' : '' ?>">Tableau de bord</a>
                <a href="index.php?page=admin_users" class="<?= $current_page === 'admin_users' ? 'active' : '' ?>">Utilisateurs</a>
                <a href="index.php?page=courses" class="<?= $current_page === 'courses' ? 'active' : '' ?>">Tous les cours</a>
            <?php endif; ?>
            <div class="navbar-right">
                <a href="index.php?page=profile" class="<?= $current_page === 'profile' ? 'active' : '' ?>"><?= e($_SESSION['prenom']) ?></a>
                <a href="actions/logout_action.php" class="btn-logout">D&eacute;connexion</a>
            </div>
        </div>
        <?php endif; ?>
    </nav>
    <main class="container">
