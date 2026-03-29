<?php
require_role(['professeur']);
$db = getDB();

$videoId = intval($_GET['id'] ?? 0);
$courseId = intval($_GET['course_id'] ?? 0);
$video = null;
$error = $_GET['error'] ?? '';

if ($videoId) {
    $stmt = $db->prepare("SELECT v.* FROM videos v JOIN courses c ON v.course_id = c.id WHERE v.id = ? AND c.professor_id = ?");
    $stmt->execute([$videoId, $_SESSION['user_id']]);
    $video = $stmt->fetch();
    if (!$video) {
        echo '<p class="alert alert-error">Vid&eacute;o introuvable.</p>';
        return;
    }
    $courseId = $video['course_id'];
}

if (!$courseId) {
    echo '<p class="alert alert-error">Cours non sp&eacute;cifi&eacute;.</p>';
    return;
}
?>

<h1><?= $video ? 'Modifier la vid&eacute;o' : 'Ajouter une vid&eacute;o' ?></h1>

<?php if ($error): ?>
    <div class="alert alert-error"><?= e($error) ?></div>
<?php endif; ?>

<form action="actions/video_action.php" method="POST" class="form-card">
    <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
    <input type="hidden" name="action" value="<?= $video ? 'update' : 'create' ?>">
    <input type="hidden" name="course_id" value="<?= $courseId ?>">
    <?php if ($video): ?>
        <input type="hidden" name="id" value="<?= $video['id'] ?>">
    <?php endif; ?>

    <div class="form-group">
        <label for="titre">Titre *</label>
        <input type="text" id="titre" name="titre" required value="<?= e($video['titre'] ?? '') ?>" placeholder="Ex: Chapitre 1 - Introduction">
    </div>

    <div class="form-group">
        <label for="youtube_url">Lien YouTube *</label>
        <input type="url" id="youtube_url" name="youtube_url" required value="<?= e($video['youtube_url'] ?? '') ?>" placeholder="https://www.youtube.com/watch?v=...">
        <small class="form-help">Collez le lien YouTube de la vid&eacute;o</small>
    </div>

    <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" rows="3" placeholder="Description de la vid&eacute;o..."><?= e($video['description'] ?? '') ?></textarea>
    </div>

    <div class="form-actions">
        <button type="submit" class="btn btn-primary"><?= $video ? 'Mettre &agrave; jour' : 'Ajouter la vid&eacute;o' ?></button>
        <a href="index.php?page=course_detail&id=<?= $courseId ?>" class="btn btn-secondary">Annuler</a>
    </div>
</form>
