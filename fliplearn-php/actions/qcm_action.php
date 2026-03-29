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

if ($action === 'create' || $action === 'update') {
    $titre = trim($_POST['titre'] ?? '');
    $pointsPerQ = intval($_POST['points_per_question'] ?? 10);
    $timer = intval($_POST['timer_seconds'] ?? 30);
    $questions = $_POST['questions'] ?? [];

    if (empty($titre) || empty($questions)) {
        header('Location: ../index.php?page=qcm_form&course_id=' . $courseId);
        exit;
    }

    $db->beginTransaction();
    try {
        if ($action === 'create') {
            $stmt = $db->prepare("INSERT INTO qcms (titre, course_id, points_per_question, timer_seconds) VALUES (?, ?, ?, ?)");
            $stmt->execute([$titre, $courseId, $pointsPerQ, $timer]);
            $qcmId = $db->lastInsertId();
        } else {
            $qcmId = intval($_POST['id'] ?? 0);
            $stmt = $db->prepare("UPDATE qcms SET titre = ?, points_per_question = ?, timer_seconds = ? WHERE id = ? AND course_id = ?");
            $stmt->execute([$titre, $pointsPerQ, $timer, $qcmId, $courseId]);
            // Supprimer les anciennes questions
            $stmt = $db->prepare("DELETE FROM questions WHERE qcm_id = ?");
            $stmt->execute([$qcmId]);
        }

        // Inserer les questions
        $stmt = $db->prepare("INSERT INTO questions (qcm_id, texte, option_a, option_b, option_c, option_d, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        foreach ($questions as $q) {
            $texte = trim($q['texte'] ?? '');
            $optA = trim($q['option_a'] ?? '');
            $optB = trim($q['option_b'] ?? '');
            $optC = trim($q['option_c'] ?? '');
            $optD = trim($q['option_d'] ?? '');
            $correct = strtoupper(trim($q['correct_answer'] ?? 'A'));
            $explanation = trim($q['explanation'] ?? '');

            if (empty($texte) || empty($optA) || empty($optB) || empty($optC) || empty($optD)) continue;
            if (!in_array($correct, ['A', 'B', 'C', 'D'])) $correct = 'A';

            $stmt->execute([$qcmId, $texte, $optA, $optB, $optC, $optD, $correct, $explanation]);
        }

        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        header('Location: ../index.php?page=qcm_form&course_id=' . $courseId);
        exit;
    }

    header('Location: ../index.php?page=course_detail&id=' . $courseId);
    exit;

} elseif ($action === 'delete') {
    $id = intval($_POST['id'] ?? 0);
    $stmt = $db->prepare("DELETE FROM qcms WHERE id = ? AND course_id = ?");
    $stmt->execute([$id, $courseId]);
    header('Location: ../index.php?page=course_detail&id=' . $courseId);
    exit;
}

header('Location: ../index.php?page=course_detail&id=' . $courseId);
exit;
