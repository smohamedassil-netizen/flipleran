<?php
// Verification de role
// Usage : require_role(['professeur', 'admin']);

function require_role(array $roles) {
    if (!isset($_SESSION['role']) || !in_array($_SESSION['role'], $roles)) {
        http_response_code(403);
        echo '<div style="text-align:center;margin-top:100px;">';
        echo '<h1>403 - Acc&egrave;s interdit</h1>';
        echo '<p>Vous n\'avez pas les droits pour acc&eacute;der &agrave; cette page.</p>';
        echo '<a href="index.php">Retour &agrave; l\'accueil</a>';
        echo '</div>';
        exit;
    }
}
