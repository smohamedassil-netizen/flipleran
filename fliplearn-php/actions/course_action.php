<?php
session_start();
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php?page=courses');
    exit;
}

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'professeur') {
    header('Location: ../index.php?page=login');
    exit;
}

if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
    header('Location: ../index.php?page=courses');
    exit;
}

$db = getDB();
$action = $_POST['action'] ?? '';
$profId = $_SESSION['user_id'];

if ($action === 'create') {
    $titre = trim($_POST['titre'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $filiere = trim($_POST['filiere'] ?? '');
    $promotion = trim($_POST['promotion'] ?? '');

    if (empty($titre) || empty($filiere) || empty($promotion)) {
        header('Location: ../index.php?page=course_form&error=' . urlencode('Veuillez remplir tous les champs obligatoires.'));
        exit;
    }

    $stmt = $db->prepare("INSERT INTO courses (titre, description, professor_id, filiere, promotion) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$titre, $description, $profId, $filiere, $promotion]);

    header('Location: ../index.php?page=course_detail&id=' . $db->lastInsertId());
    exit;

} elseif ($action === 'update') {
    $id = intval($_POST['id'] ?? 0);
    $titre = trim($_POST['titre'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $filiere = trim($_POST['filiere'] ?? '');
    $promotion = trim($_POST['promotion'] ?? '');

    // Verifier que le cours appartient au prof
    $stmt = $db->prepare("SELECT id FROM courses WHERE id = ? AND professor_id = ?");
    $stmt->execute([$id, $profId]);
    if (!$stmt->fetch()) {
        header('Location: ../index.php?page=courses');
        exit;
    }

    $stmt = $db->prepare("UPDATE courses SET titre = ?, description = ?, filiere = ?, promotion = ? WHERE id = ? AND professor_id = ?");
    $stmt->execute([$titre, $description, $filiere, $promotion, $id, $profId]);

    header('Location: ../index.php?page=course_detail&id=' . $id);
    exit;

} elseif ($action === 'delete') {
    $id = intval($_POST['id'] ?? 0);
    $stmt = $db->prepare("DELETE FROM courses WHERE id = ? AND professor_id = ?");
    $stmt->execute([$id, $profId]);
    header('Location: ../index.php?page=courses');
    exit;
}

header('Location: ../index.php?page=courses');
exit;
