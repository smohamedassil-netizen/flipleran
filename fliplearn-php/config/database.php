<?php
// Configuration de la base de donnees MySQL
// Modifier ces valeurs selon votre environnement local (XAMPP, WAMP, MAMP...)

define('DB_HOST', 'localhost');
define('DB_NAME', 'fliplearn');
define('DB_USER', 'root');
define('DB_PASS', ''); // Vide par defaut sur XAMPP/WAMP

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            die("Erreur de connexion : " . $e->getMessage());
        }
    }
    return $pdo;
}
