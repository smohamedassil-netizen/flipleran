<?php
// Verification d'authentification
// Inclure ce fichier en haut de chaque page protegee

if (!isset($_SESSION['user_id'])) {
    header('Location: index.php?page=login');
    exit;
}
