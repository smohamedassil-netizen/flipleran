<?php
$db = getDB();
$role = $_SESSION['role'];

if ($role === 'professeur') {
    // Le prof voit ses propres cours
    $stmt = $db->prepare("SELECT c.*, (SELECT COUNT(*) FROM videos WHERE course_id = c.id) as nb_videos FROM courses c WHERE c.professor_id = ? ORDER BY c.created_at DESC");
    $stmt->execute([$_SESSION['user_id']]);
} else {
    // Etudiants et admins voient tous les cours actifs
    $stmt = $db->prepare("SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom, (SELECT COUNT(*) FROM videos WHERE course_id = c.id) as nb_videos FROM courses c JOIN users u ON c.professor_id = u.id WHERE c.is_active = 1 ORDER BY c.created_at DESC");
    $stmt->execute();
}
$courses = $stmt->fetchAll();

// Filtre par filiere
$filiere = $_GET['filiere'] ?? '';
if ($filiere) {
    $courses = array_filter($courses, fn($c) => $c['filiere'] === $filiere);
}
?>

<div class="section-header">
    <h1><?= $role === 'professeur' ? 'Mes cours' : 'Cours disponibles' ?></h1>
    <?php if ($role === 'professeur'): ?>
        <a href="index.php?page=course_form" class="btn btn-primary">+ Nouveau cours</a>
    <?php endif; ?>
</div>

<?php if (empty($courses)): ?>
    <p class="text-muted">Aucun cours trouv&eacute;.</p>
<?php else: ?>
    <div class="cards-grid">
        <?php foreach ($courses as $course): ?>
            <div class="card">
                <div class="card-header">
                    <h3><a href="index.php?page=course_detail&id=<?= $course['id'] ?>"><?= e($course['titre']) ?></a></h3>
                    <span class="badge"><?= e($course['filiere']) ?></span>
                </div>
                <p><?= e(substr($course['description'] ?? '', 0, 200)) ?></p>
                <?php if (isset($course['prof_prenom'])): ?>
                    <p class="text-muted">Prof. <?= e($course['prof_prenom'] . ' ' . $course['prof_nom']) ?></p>
                <?php endif; ?>
                <div class="card-footer">
                    <span><?= $course['nb_videos'] ?> vid&eacute;o(s)</span>
                    <a href="index.php?page=course_detail&id=<?= $course['id'] ?>" class="btn btn-small">Voir</a>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
