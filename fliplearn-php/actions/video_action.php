<?php
session_start();
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user_id']) || $_SESSION['role'] !== 'professeur') {
    header('Location: ../index.php');
    exit;
}

if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
    header('Location: ../index.php');
    exit;
}

$db = getDB();
$action = $_POST['action'] ?? '';
$courseId = intval($_POST['course_id'] ?? 0);
$profId = $_SESSION['user_id'];

// Verifier que le cours appartient au prof
$stmt = $db->prepare("SELECT id FROM courses WHERE id = ? AND professor_id = ?");
$stmt->execute([$courseId, $profId]);
if (!$stmt->fetch()) {
    header('Location: ../index.php?page=courses');
    exit;
}

if ($action === 'create') {
    $titre = trim($_POST['titre'] ?? '');
    $youtube_url = trim($_POST['youtube_url'] ?? '');
    $description = trim($_POST['description'] ?? '');

    if (empty($titre) || empty($youtube_url)) {
        header('Location: ../index.php?page=video_form&course_id=' . $courseId . '&error=' . urlencode('Veuillez remplir les champs obligatoires.'));
        exit;
    }

    $stmt = $db->prepare("INSERT INTO videos (titre, youtube_url, description, course_id, created_by) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$titre, $youtube_url, $description, $courseId, $profId]);

    header('Location: ../index.php?page=course_detail&id=' . $courseId);
    exit;

} elseif ($action === 'update') {
    $id = intval($_POST['id'] ?? 0);
    $titre = trim($_POST['titre'] ?? '');
    $youtube_url = trim($_POST['youtube_url'] ?? '');
    $description = trim($_POST['description'] ?? '');

    $stmt = $db->prepare("UPDATE videos SET titre = ?, youtube_url = ?, description = ? WHERE id = ? AND course_id = ?");
    $stmt->execute([$titre, $youtube_url, $description, $id, $courseId]);

    header('Location: ../index.php?page=course_detail&id=' . $courseId);
    exit;

} elseif ($action === 'delete') {
    $id = intval($_POST['id'] ?? 0);
    $stmt = $db->prepare("DELETE FROM videos WHERE id = ? AND course_id = ?");
    $stmt->execute([$id, $courseId]);
    header('Location: ../index.php?page=course_detail&id=' . $courseId);
    exit;
}

header('Location: ../index.php?page=course_detail&id=' . $courseId);
exit;
