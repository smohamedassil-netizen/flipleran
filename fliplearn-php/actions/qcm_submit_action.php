<?php
session_start();
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user_id']) || $_SESSION['role'] !== 'etudiant') {
    header('Location: ../index.php');
    exit;
}

if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== ($_SESSION['csrf_token'] ?? '')) {
    header('Location: ../index.php');
    exit;
}

$db = getDB();
$qcmId = intval($_POST['qcm_id'] ?? 0);
$userId = $_SESSION['user_id'];
$userAnswers = $_POST['answers'] ?? [];

// Verifier que le QCM existe
$stmt = $db->prepare("SELECT * FROM qcms WHERE id = ?");
$stmt->execute([$qcmId]);
$qcm = $stmt->fetch();

if (!$qcm) {
    header('Location: ../index.php?page=courses');
    exit;
}

// Verifier si deja passe
$stmt = $db->prepare("SELECT id FROM qcm_results WHERE qcm_id = ? AND user_id = ?");
$stmt->execute([$qcmId, $userId]);
if ($stmt->fetch()) {
    header('Location: ../index.php?page=course_detail&id=' . $qcm['course_id']);
    exit;
}

// Recuperer toutes les questions avec les reponses correctes
$stmt = $db->prepare("SELECT * FROM questions WHERE qcm_id = ? ORDER BY id ASC");
$stmt->execute([$qcmId]);
$questions = $stmt->fetchAll();

$totalQuestions = count($questions);
$correctCount = 0;

$db->beginTransaction();
try {
    // Calculer le score
    $answersToInsert = [];
    foreach ($questions as $q) {
        $given = strtoupper($userAnswers[$q['id']] ?? '');
        $isCorrect = ($given === $q['correct_answer']) ? 1 : 0;
        if ($isCorrect) $correctCount++;
        $answersToInsert[] = [
            'question_id' => $q['id'],
            'answer_given' => $given ?: null,
            'is_correct' => $isCorrect
        ];
    }

    $score = $totalQuestions > 0 ? round(($correctCount / $totalQuestions) * 100) : 0;
    $pointsEarned = $correctCount * $qcm['points_per_question'];

    // Inserer le resultat
    $stmt = $db->prepare("INSERT INTO qcm_results (qcm_id, user_id, score, correct_count, total_questions, points_earned) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$qcmId, $userId, $score, $correctCount, $totalQuestions, $pointsEarned]);
    $resultId = $db->lastInsertId();

    // Inserer les reponses detaillees
    $stmt = $db->prepare("INSERT INTO student_answers (result_id, question_id, answer_given, is_correct) VALUES (?, ?, ?, ?)");
    foreach ($answersToInsert as $a) {
        $stmt->execute([$resultId, $a['question_id'], $a['answer_given'], $a['is_correct']]);
    }

    // Mettre a jour les points de l'etudiant
    $stmt = $db->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    $stmt->execute([$pointsEarned, $userId]);

    $db->commit();

    header('Location: ../index.php?page=qcm_result&result_id=' . $resultId);
    exit;

} catch (Exception $e) {
    $db->rollBack();
    header('Location: ../index.php?page=course_detail&id=' . $qcm['course_id']);
    exit;
}
