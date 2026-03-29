<?php
require_role(['professeur']);
$db = getDB();

$qcmId = intval($_GET['id'] ?? 0);
$courseId = intval($_GET['course_id'] ?? 0);
$qcm = null;
$questions = [];

if ($qcmId) {
    $stmt = $db->prepare("SELECT q.* FROM qcms q JOIN courses c ON q.course_id = c.id WHERE q.id = ? AND c.professor_id = ?");
    $stmt->execute([$qcmId, $_SESSION['user_id']]);
    $qcm = $stmt->fetch();
    if (!$qcm) {
        echo '<p class="alert alert-error">QCM introuvable.</p>';
        return;
    }
    $courseId = $qcm['course_id'];

    $stmt = $db->prepare("SELECT * FROM questions WHERE qcm_id = ? ORDER BY id ASC");
    $stmt->execute([$qcmId]);
    $questions = $stmt->fetchAll();
}

if (!$courseId) {
    echo '<p class="alert alert-error">Cours non sp&eacute;cifi&eacute;.</p>';
    return;
}
?>

<h1><?= $qcm ? 'Modifier le QCM' : 'Cr&eacute;er un QCM' ?></h1>

<form action="actions/qcm_action.php" method="POST" class="form-card" id="qcm-form">
    <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
    <input type="hidden" name="action" value="<?= $qcm ? 'update' : 'create' ?>">
    <input type="hidden" name="course_id" value="<?= $courseId ?>">
    <?php if ($qcm): ?>
        <input type="hidden" name="id" value="<?= $qcm['id'] ?>">
    <?php endif; ?>

    <div class="form-group">
        <label for="titre">Titre du QCM *</label>
        <input type="text" id="titre" name="titre" required value="<?= e($qcm['titre'] ?? '') ?>" placeholder="Ex: Quiz - Chapitre 1">
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="points_per_question">Points par question</label>
            <input type="number" id="points_per_question" name="points_per_question" value="<?= $qcm['points_per_question'] ?? 10 ?>" min="1" max="100">
        </div>
        <div class="form-group">
            <label for="timer_seconds">Timer par question (sec)</label>
            <input type="number" id="timer_seconds" name="timer_seconds" value="<?= $qcm['timer_seconds'] ?? 30 ?>" min="10" max="300">
        </div>
    </div>

    <h2>Questions</h2>
    <div id="questions-container">
        <?php if (!empty($questions)): ?>
            <?php foreach ($questions as $i => $q): ?>
                <div class="question-block" data-index="<?= $i ?>">
                    <div class="question-header">
                        <h3>Question <?= $i + 1 ?></h3>
                        <button type="button" class="btn btn-small btn-danger" onclick="removeQuestion(this)">&times; Supprimer</button>
                    </div>
                    <div class="form-group">
                        <label>Intitul&eacute; *</label>
                        <textarea name="questions[<?= $i ?>][texte]" required rows="2"><?= e($q['texte']) ?></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Option A *</label>
                            <input type="text" name="questions[<?= $i ?>][option_a]" required value="<?= e($q['option_a']) ?>">
                        </div>
                        <div class="form-group">
                            <label>Option B *</label>
                            <input type="text" name="questions[<?= $i ?>][option_b]" required value="<?= e($q['option_b']) ?>">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Option C *</label>
                            <input type="text" name="questions[<?= $i ?>][option_c]" required value="<?= e($q['option_c']) ?>">
                        </div>
                        <div class="form-group">
                            <label>Option D *</label>
                            <input type="text" name="questions[<?= $i ?>][option_d]" required value="<?= e($q['option_d']) ?>">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>R&eacute;ponse correcte *</label>
                            <select name="questions[<?= $i ?>][correct_answer]" required>
                                <option value="A" <?= $q['correct_answer'] === 'A' ? 'selected' : '' ?>>A</option>
                                <option value="B" <?= $q['correct_answer'] === 'B' ? 'selected' : '' ?>>B</option>
                                <option value="C" <?= $q['correct_answer'] === 'C' ? 'selected' : '' ?>>C</option>
                                <option value="D" <?= $q['correct_answer'] === 'D' ? 'selected' : '' ?>>D</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Explication (optionnel)</label>
                            <input type="text" name="questions[<?= $i ?>][explanation]" value="<?= e($q['explanation'] ?? '') ?>">
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <button type="button" class="btn btn-secondary" id="add-question" onclick="addQuestion()">+ Ajouter une question</button>

    <div class="form-actions" style="margin-top: 20px;">
        <button type="submit" class="btn btn-primary"><?= $qcm ? 'Mettre &agrave; jour' : 'Cr&eacute;er le QCM' ?></button>
        <a href="index.php?page=course_detail&id=<?= $courseId ?>" class="btn btn-secondary">Annuler</a>
    </div>
</form>

<template id="question-template">
    <div class="question-block" data-index="__INDEX__">
        <div class="question-header">
            <h3>Question __NUM__</h3>
            <button type="button" class="btn btn-small btn-danger" onclick="removeQuestion(this)">&times; Supprimer</button>
        </div>
        <div class="form-group">
            <label>Intitul&eacute; *</label>
            <textarea name="questions[__INDEX__][texte]" required rows="2"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Option A *</label>
                <input type="text" name="questions[__INDEX__][option_a]" required>
            </div>
            <div class="form-group">
                <label>Option B *</label>
                <input type="text" name="questions[__INDEX__][option_b]" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Option C *</label>
                <input type="text" name="questions[__INDEX__][option_c]" required>
            </div>
            <div class="form-group">
                <label>Option D *</label>
                <input type="text" name="questions[__INDEX__][option_d]" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>R&eacute;ponse correcte *</label>
                <select name="questions[__INDEX__][correct_answer]" required>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                </select>
            </div>
            <div class="form-group">
                <label>Explication (optionnel)</label>
                <input type="text" name="questions[__INDEX__][explanation]">
            </div>
        </div>
    </div>
</template>

<script>
let questionIndex = <?= max(count($questions), 0) ?>;

function addQuestion() {
    const template = document.getElementById('question-template').innerHTML;
    const html = template.replace(/__INDEX__/g, questionIndex).replace(/__NUM__/g, questionIndex + 1);
    document.getElementById('questions-container').insertAdjacentHTML('beforeend', html);
    questionIndex++;
}

function removeQuestion(btn) {
    btn.closest('.question-block').remove();
    // Re-numerote les titres
    document.querySelectorAll('.question-block h3').forEach((h, i) => {
        h.textContent = 'Question ' + (i + 1);
    });
}

// Ajouter une question par defaut si aucune
if (questionIndex === 0) addQuestion();
</script>
