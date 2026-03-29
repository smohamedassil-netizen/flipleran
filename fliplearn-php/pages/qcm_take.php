<?php
require_role(['etudiant']);
$db = getDB();
$qcmId = intval($_GET['id'] ?? 0);

if (!$qcmId) {
    echo '<p class="alert alert-error">QCM introuvable.</p>';
    return;
}

// Verifier si deja passe
$stmt = $db->prepare("SELECT id FROM qcm_results WHERE qcm_id = ? AND user_id = ?");
$stmt->execute([$qcmId, $_SESSION['user_id']]);
if ($stmt->fetch()) {
    echo '<div class="alert alert-error">Vous avez d&eacute;j&agrave; pass&eacute; ce QCM.</div>';
    echo '<a href="index.php?page=courses" class="btn btn-secondary">Retour aux cours</a>';
    return;
}

// Recuperer le QCM
$stmt = $db->prepare("SELECT q.*, c.titre as course_titre FROM qcms q JOIN courses c ON q.course_id = c.id WHERE q.id = ?");
$stmt->execute([$qcmId]);
$qcm = $stmt->fetch();

if (!$qcm) {
    echo '<p class="alert alert-error">QCM introuvable.</p>';
    return;
}

// Recuperer les questions (sans la reponse correcte dans le HTML visible)
$stmt = $db->prepare("SELECT id, texte, option_a, option_b, option_c, option_d FROM questions WHERE qcm_id = ? ORDER BY id ASC");
$stmt->execute([$qcmId]);
$questions = $stmt->fetchAll();

if (empty($questions)) {
    echo '<p class="alert alert-error">Ce QCM n\'a pas de questions.</p>';
    return;
}

// Preparer les donnees JSON pour le JS (sans les reponses correctes !)
$questionsJson = json_encode($questions);
?>

<div class="qcm-container">
    <div class="qcm-header">
        <h1><?= e($qcm['titre']) ?></h1>
        <p class="text-muted">Cours : <?= e($qcm['course_titre']) ?> | <?= count($questions) ?> question(s) | <?= $qcm['timer_seconds'] ?>s par question</p>
    </div>

    <div id="qcm-progress">
        <div class="progress-bar">
            <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
        </div>
        <span id="progress-text">Question 1/<?= count($questions) ?></span>
    </div>

    <div id="timer-display" class="timer">
        <span id="timer-value"><?= $qcm['timer_seconds'] ?></span>s
    </div>

    <div id="question-display">
        <!-- Rempli par JS -->
    </div>

    <form id="qcm-submit-form" action="actions/qcm_submit_action.php" method="POST" style="display:none">
        <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
        <input type="hidden" name="qcm_id" value="<?= $qcmId ?>">
        <div id="answers-container"></div>
    </form>
</div>

<script>
    const questions = <?= $questionsJson ?>;
    const timerSeconds = <?= $qcm['timer_seconds'] ?>;
</script>
<script src="assets/js/qcm.js"></script>
