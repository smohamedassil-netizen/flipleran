<?php
$db = getDB();
$courseId = intval($_GET['id'] ?? 0);

if (!$courseId) {
    echo '<p class="alert alert-error">Cours introuvable.</p>';
    return;
}

// Recuperer le cours
$stmt = $db->prepare("SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom FROM courses c JOIN users u ON c.professor_id = u.id WHERE c.id = ?");
$stmt->execute([$courseId]);
$course = $stmt->fetch();

if (!$course) {
    echo '<p class="alert alert-error">Cours introuvable.</p>';
    return;
}

$isOwner = ($_SESSION['user_id'] == $course['professor_id']);

// Videos du cours
$stmt = $db->prepare("SELECT * FROM videos WHERE course_id = ? ORDER BY position ASC, created_at ASC");
$stmt->execute([$courseId]);
$videos = $stmt->fetchAll();

// QCMs du cours
$stmt = $db->prepare("SELECT q.*, (SELECT COUNT(*) FROM questions WHERE qcm_id = q.id) as nb_questions FROM qcms q WHERE q.course_id = ? ORDER BY q.created_at DESC");
$stmt->execute([$courseId]);
$qcms = $stmt->fetchAll();

// Resultats de l'etudiant pour ce cours
$myResults = [];
if ($_SESSION['role'] === 'etudiant') {
    $stmt = $db->prepare("SELECT qr.* FROM qcm_results qr JOIN qcms q ON qr.qcm_id = q.id WHERE q.course_id = ? AND qr.user_id = ?");
    $stmt->execute([$courseId, $_SESSION['user_id']]);
    foreach ($stmt->fetchAll() as $r) {
        $myResults[$r['qcm_id']] = $r;
    }
}
?>

<div class="course-header">
    <div>
        <h1><?= e($course['titre']) ?></h1>
        <p class="text-muted">Par <?= e($course['prof_prenom'] . ' ' . $course['prof_nom']) ?> | <?= e($course['filiere']) ?> - <?= e($course['promotion']) ?></p>
    </div>
    <?php if ($isOwner): ?>
        <div class="course-actions">
            <a href="index.php?page=course_form&id=<?= $courseId ?>" class="btn btn-small">Modifier</a>
            <a href="index.php?page=video_form&course_id=<?= $courseId ?>" class="btn btn-small btn-secondary">+ Vid&eacute;o</a>
            <a href="index.php?page=qcm_form&course_id=<?= $courseId ?>" class="btn btn-small btn-secondary">+ QCM</a>
        </div>
    <?php endif; ?>
</div>

<?php if ($course['description']): ?>
    <div class="course-description">
        <p><?= nl2br(e($course['description'])) ?></p>
    </div>
<?php endif; ?>

<!-- VIDEOS -->
<h2>Vid&eacute;os du cours</h2>
<?php if (empty($videos)): ?>
    <p class="text-muted">Aucune vid&eacute;o pour ce cours.</p>
<?php else: ?>
    <div class="videos-grid">
        <?php foreach ($videos as $video): ?>
            <div class="video-card">
                <div class="video-embed">
                    <iframe src="https://www.youtube.com/embed/<?= e(youtube_id($video['youtube_url'])) ?>"
                            frameborder="0" allowfullscreen></iframe>
                </div>
                <h3><?= e($video['titre']) ?></h3>
                <?php if ($video['description']): ?>
                    <p class="text-muted"><?= e($video['description']) ?></p>
                <?php endif; ?>
                <?php if ($isOwner): ?>
                    <div class="card-actions">
                        <a href="index.php?page=video_form&id=<?= $video['id'] ?>" class="btn btn-small">Modifier</a>
                        <form action="actions/video_action.php" method="POST" style="display:inline" onsubmit="return confirm('Supprimer cette vid&eacute;o ?')">
                            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="<?= $video['id'] ?>">
                            <input type="hidden" name="course_id" value="<?= $courseId ?>">
                            <button type="submit" class="btn btn-small btn-danger">Supprimer</button>
                        </form>
                    </div>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<!-- QCMs -->
<h2>QCM / Quiz</h2>
<?php if (empty($qcms)): ?>
    <p class="text-muted">Aucun QCM pour ce cours.</p>
<?php else: ?>
    <div class="qcm-list">
        <?php foreach ($qcms as $qcm): ?>
            <div class="card qcm-card">
                <div class="card-header">
                    <h3><?= e($qcm['titre']) ?></h3>
                    <span class="badge"><?= $qcm['nb_questions'] ?> question(s)</span>
                </div>
                <p class="text-muted"><?= $qcm['points_per_question'] ?> pts/question | Timer: <?= $qcm['timer_seconds'] ?>s</p>

                <?php if ($_SESSION['role'] === 'etudiant'): ?>
                    <?php if (isset($myResults[$qcm['id']])): ?>
                        <p class="score-display">Score: <strong><?= $myResults[$qcm['id']]['score'] ?>%</strong>
                        (<?= $myResults[$qcm['id']]['correct_count'] ?>/<?= $myResults[$qcm['id']]['total_questions'] ?>)
                        - <?= $myResults[$qcm['id']]['points_earned'] ?> pts gagn&eacute;s</p>
                        <a href="index.php?page=qcm_result&result_id=<?= $myResults[$qcm['id']]['id'] ?>" class="btn btn-small">Voir corrections</a>
                    <?php else: ?>
                        <a href="index.php?page=qcm_take&id=<?= $qcm['id'] ?>" class="btn btn-primary">Passer le QCM</a>
                    <?php endif; ?>
                <?php elseif ($isOwner): ?>
                    <div class="card-actions">
                        <a href="index.php?page=qcm_form&id=<?= $qcm['id'] ?>&course_id=<?= $courseId ?>" class="btn btn-small">Modifier</a>
                        <form action="actions/qcm_action.php" method="POST" style="display:inline" onsubmit="return confirm('Supprimer ce QCM ?')">
                            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="<?= $qcm['id'] ?>">
                            <input type="hidden" name="course_id" value="<?= $courseId ?>">
                            <button type="submit" class="btn btn-small btn-danger">Supprimer</button>
                        </form>
                    </div>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
