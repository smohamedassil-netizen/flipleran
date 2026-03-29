<?php
session_start();
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header('Location: ../index.php');
    exit;
}

if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
    header('Location: ../index.php?page=admin_users');
    exit;
}

$db = getDB();
$action = $_POST['action'] ?? '';
$targetId = intval($_POST['user_id'] ?? 0);

// Ne pas modifier soi-meme
if ($targetId === $_SESSION['user_id']) {
    header('Location: ../index.php?page=admin_users');
    exit;
}

if ($action === 'toggle_active') {
    $stmt = $db->prepare("UPDATE users SET is_active = NOT is_active WHERE id = ?");
    $stmt->execute([$targetId]);
    header('Location: ../index.php?page=admin_users&success=' . urlencode('Statut mis &agrave; jour.'));
    exit;

} elseif ($action === 'delete') {
    $stmt = $db->prepare("DELETE FROM users WHERE id = ? AND id != ?");
    $stmt->execute([$targetId, $_SESSION['user_id']]);
    header('Location: ../index.php?page=admin_users&success=' . urlencode('Utilisateur supprim&eacute;.'));
    exit;
}

header('Location: ../index.php?page=admin_users');
exit;
