<?php
require_role(['etudiant']);
$db = getDB();
$resultId = intval($_GET['result_id'] ?? 0);

// Recuperer le resultat
$stmt = $db->prepare("SELECT qr.*, q.titre as qcm_titre, q.course_id, c.titre as course_titre FROM qcm_results qr JOIN qcms q ON qr.qcm_id = q.id JOIN courses c ON q.course_id = c.id WHERE qr.id = ? AND qr.user_id = ?");
$stmt->execute([$resultId, $_SESSION['user_id']]);
$result = $stmt->fetch();

if (!$result) {
    echo '<p class="alert alert-error">R&eacute;sultat introuvable.</p>';
    return;
}

// Recuperer les reponses detaillees
$stmt = $db->prepare("SELECT sa.*, q.texte, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation FROM student_answers sa JOIN questions q ON sa.question_id = q.id WHERE sa.result_id = ? ORDER BY q.id ASC");
$stmt->execute([$resultId]);
$answers = $stmt->fetchAll();

$scoreClass = $result['score'] >= 80 ? 'score-good' : ($result['score'] >= 50 ? 'score-ok' : 'score-bad');
?>

<div class="result-container">
    <div class="result-header <?= $scoreClass ?>">
        <h1><?= $result['score'] >= 80 ? 'Excellent !' : ($result['score'] >= 50 ? 'Pas mal !' : 'Courage !') ?></h1>
        <div class="result-score"><?= $result['score'] ?>%</div>
        <p><?= $result['correct_count'] ?>/<?= $result['total_questions'] ?> bonnes r&eacute;ponses</p>
        <p><strong>+<?= $result['points_earned'] ?> points</strong></p>
    </div>

    <h2>Corrections - <?= e($result['qcm_titre']) ?></h2>

    <?php foreach ($answers as $i => $a): ?>
        <div class="correction-card <?= $a['is_correct'] ? 'correct' : 'incorrect' ?>">
            <h3>Question <?= $i + 1 ?> <?= $a['is_correct'] ? '&#10004;' : '&#10008;' ?></h3>
            <p class="question-text"><?= e($a['texte']) ?></p>

            <div class="correction-options">
                <?php foreach (['A' => 'option_a', 'B' => 'option_b', 'C' => 'option_c', 'D' => 'option_d'] as $letter => $field): ?>
                    <div class="correction-option <?= $letter === $a['correct_answer'] ? 'option-correct' : '' ?> <?= $letter === $a['answer_given'] && !$a['is_correct'] ? 'option-wrong' : '' ?>">
                        <span class="option-letter"><?= $letter ?></span>
                        <?= e($a[$field]) ?>
                        <?php if ($letter === $a['correct_answer']): ?>
                            <span class="badge-correct">&#10004; Correct</span>
                        <?php endif; ?>
                        <?php if ($letter === $a['answer_given'] && !$a['is_correct']): ?>
                            <span class="badge-wrong">Votre r&eacute;ponse</span>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>

            <?php if ($a['explanation']): ?>
                <p class="explanation"><strong>Explication :</strong> <?= e($a['explanation']) ?></p>
            <?php endif; ?>
        </div>
    <?php endforeach; ?>

    <div class="form-actions">
        <a href="index.php?page=course_detail&id=<?= $result['course_id'] ?>" class="btn btn-primary">Retour au cours</a>
        <a href="index.php?page=leaderboard" class="btn btn-secondary">Voir le classement</a>
    </div>
</div>
