<?php
// Redirection vers le dashboard correspondant au role
$role = $_SESSION['role'];
switch ($role) {
    case 'etudiant':
        include 'pages/dashboard_etudiant.php';
        break;
    case 'professeur':
        include 'pages/dashboard_professeur.php';
        break;
    case 'admin':
        include 'pages/dashboard_admin.php';
        break;
    default:
        echo '<p>R&ocirc;le inconnu.</p>';
}
