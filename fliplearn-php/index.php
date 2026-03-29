<?php
session_start();
require_once 'config/database.php';

// Pages autorisees (whitelist pour eviter les injections de fichier)
$public_pages = ['login', 'register'];
$protected_pages = [
    'dashboard', 'courses', 'course_detail', 'course_form',
    'video_form', 'qcm_form', 'qcm_take', 'qcm_result',
    'leaderboard', 'admin_users', 'profile'
];

$page = $_GET['page'] ?? '';

// Redirection par defaut
if (empty($page)) {
    if (isset($_SESSION['user_id'])) {
        header('Location: index.php?page=dashboard');
    } else {
        header('Location: index.php?page=login');
    }
    exit;
}

// Verification que la page existe dans la whitelist
if (in_array($page, $public_pages)) {
    // Pages publiques : rediriger si deja connecte
    if (isset($_SESSION['user_id']) && $page !== 'register') {
        header('Location: index.php?page=dashboard');
        exit;
    }
    include 'includes/header.php';
    include "pages/{$page}.php";
    include 'includes/footer.php';
} elseif (in_array($page, $protected_pages)) {
    // Pages protegees : verifier l'authentification
    include 'includes/auth_check.php';
    include 'includes/role_check.php';
    include 'includes/header.php';
    include "pages/{$page}.php";
    include 'includes/footer.php';
} else {
    // Page 404
    http_response_code(404);
    include 'includes/header.php';
    echo '<div style="text-align:center;margin-top:100px;">';
    echo '<h1>404 - Page non trouv&eacute;e</h1>';
    echo '<a href="index.php">Retour &agrave; l\'accueil</a>';
    echo '</div>';
    include 'includes/footer.php';
}
