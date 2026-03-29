<?php
require_role(['professeur']);
$db = getDB();

$courseId = intval($_GET['id'] ?? 0);
$course = null;
$error = $_GET['error'] ?? '';

if ($courseId) {
    $stmt = $db->prepare("SELECT * FROM courses WHERE id = ? AND professor_id = ?");
    $stmt->execute([$courseId, $_SESSION['user_id']]);
    $course = $stmt->fetch();
    if (!$course) {
        echo '<p class="alert alert-error">Cours introuvable ou acc&egrave;s refus&eacute;.</p>';
        return;
    }
}
?>

<h1><?= $course ? 'Modifier le cours' : 'Nouveau cours' ?></h1>

<?php if ($error): ?>
    <div class="alert alert-error"><?= e($error) ?></div>
<?php endif; ?>

<form action="actions/course_action.php" method="POST" class="form-card">
    <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
    <input type="hidden" name="action" value="<?= $course ? 'update' : 'create' ?>">
    <?php if ($course): ?>
        <input type="hidden" name="id" value="<?= $course['id'] ?>">
    <?php endif; ?>

    <div class="form-group">
        <label for="titre">Titre du cours *</label>
        <input type="text" id="titre" name="titre" required value="<?= e($course['titre'] ?? '') ?>" placeholder="Ex: Introduction aux bases de donn&eacute;es">
    </div>

    <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" rows="4" placeholder="D&eacute;crivez le contenu du cours..."><?= e($course['description'] ?? '') ?></textarea>
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="filiere">Fili&egrave;re *</label>
            <input type="text" id="filiere" name="filiere" required value="<?= e($course['filiere'] ?? '') ?>" placeholder="Ex: Informatique">
        </div>
        <div class="form-group">
            <label for="promotion">Promotion *</label>
            <input type="text" id="promotion" name="promotion" required value="<?= e($course['promotion'] ?? '') ?>" placeholder="Ex: L3 2024-2025">
        </div>
    </div>

    <div class="form-actions">
        <button type="submit" class="btn btn-primary"><?= $course ? 'Mettre &agrave; jour' : 'Cr&eacute;er le cours' ?></button>
        <a href="index.php?page=courses" class="btn btn-secondary">Annuler</a>
    </div>
</form>
