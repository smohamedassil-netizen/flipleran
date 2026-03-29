<?php
$db = getDB();
$profId = $_SESSION['user_id'];

// Mes cours
$stmt = $db->prepare("SELECT c.*, (SELECT COUNT(*) FROM videos WHERE course_id = c.id) as nb_videos, (SELECT COUNT(*) FROM qcms WHERE course_id = c.id) as nb_qcms FROM courses c WHERE c.professor_id = ? ORDER BY c.created_at DESC");
$stmt->execute([$profId]);
$courses = $stmt->fetchAll();

// Stats globales
$totalCourses = count($courses);
$stmt = $db->prepare("SELECT COUNT(*) as total FROM qcm_results qr JOIN qcms q ON qr.qcm_id = q.id JOIN courses c ON q.course_id = c.id WHERE c.professor_id = ?");
$stmt->execute([$profId]);
$totalSubmissions = $stmt->fetch()['total'];
?>

<h1>Espace Professeur</h1>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-number"><?= $totalCourses ?></div>
        <div class="stat-label">Cours cr&eacute;&eacute;s</div>
    </div>
    <div class="stat-card">
        <div class="stat-number"><?= $totalSubmissions ?></div>
        <div class="stat-label">QCM soumis</div>
    </div>
</div>

<div class="section-header">
    <h2>Mes cours</h2>
    <a href="index.php?page=course_form" class="btn btn-primary">+ Nouveau cours</a>
</div>

<?php if (empty($courses)): ?>
    <p class="text-muted">Vous n'avez pas encore cr&eacute;&eacute; de cours.</p>
<?php else: ?>
    <div class="cards-grid">
        <?php foreach ($courses as $course): ?>
            <div class="card">
                <h3><a href="index.php?page=course_detail&id=<?= $course['id'] ?>"><?= e($course['titre']) ?></a></h3>
                <p class="text-muted"><?= e($course['filiere']) ?> - <?= e($course['promotion']) ?></p>
                <div class="card-stats">
                    <span><?= $course['nb_videos'] ?> vid&eacute;o(s)</span>
                    <span><?= $course['nb_qcms'] ?> QCM</span>
                </div>
                <div class="card-actions">
                    <a href="index.php?page=course_form&id=<?= $course['id'] ?>" class="btn btn-small">Modifier</a>
                    <a href="index.php?page=video_form&course_id=<?= $course['id'] ?>" class="btn btn-small btn-secondary">+ Vid&eacute;o</a>
                    <a href="index.php?page=qcm_form&course_id=<?= $course['id'] ?>" class="btn btn-small btn-secondary">+ QCM</a>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
