<?php
$db = getDB();
$userId = $_SESSION['user_id'];

// Stats de l'etudiant
$stmt = $db->prepare("SELECT points FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

// Nombre de QCM completes
$stmt = $db->prepare("SELECT COUNT(*) as total, AVG(score) as moyenne FROM qcm_results WHERE user_id = ?");
$stmt->execute([$userId]);
$stats = $stmt->fetch();

// Cours disponibles
$stmt = $db->prepare("SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom FROM courses c JOIN users u ON c.professor_id = u.id WHERE c.is_active = 1 ORDER BY c.created_at DESC LIMIT 5");
$stmt->execute();
$courses = $stmt->fetchAll();

// Top 5 classement
$stmt = $db->prepare("SELECT nom, prenom, points FROM users WHERE role = 'etudiant' AND is_active = 1 ORDER BY points DESC LIMIT 5");
$stmt->execute();
$top5 = $stmt->fetchAll();
?>

<h1>Bonjour <?= e($_SESSION['prenom']) ?> !</h1>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-number"><?= $user['points'] ?? 0 ?></div>
        <div class="stat-label">Points</div>
    </div>
    <div class="stat-card">
        <div class="stat-number"><?= $stats['total'] ?? 0 ?></div>
        <div class="stat-label">QCM compl&eacute;t&eacute;s</div>
    </div>
    <div class="stat-card">
        <div class="stat-number"><?= $stats['moyenne'] ? round($stats['moyenne']) . '%' : '-' ?></div>
        <div class="stat-label">Moyenne</div>
    </div>
</div>

<div class="dashboard-grid">
    <div class="dashboard-section">
        <h2>Cours disponibles</h2>
        <?php if (empty($courses)): ?>
            <p class="text-muted">Aucun cours disponible pour le moment.</p>
        <?php else: ?>
            <?php foreach ($courses as $course): ?>
                <div class="card">
                    <h3><a href="index.php?page=course_detail&id=<?= $course['id'] ?>"><?= e($course['titre']) ?></a></h3>
                    <p class="text-muted">Par <?= e($course['prof_prenom'] . ' ' . $course['prof_nom']) ?> | <?= e($course['filiere']) ?></p>
                    <p><?= e(substr($course['description'] ?? '', 0, 150)) ?>...</p>
                </div>
            <?php endforeach; ?>
            <a href="index.php?page=courses" class="btn btn-secondary">Voir tous les cours</a>
        <?php endif; ?>
    </div>

    <div class="dashboard-section">
        <h2>Classement</h2>
        <table class="table">
            <thead>
                <tr><th>#</th><th>Nom</th><th>Points</th></tr>
            </thead>
            <tbody>
                <?php foreach ($top5 as $i => $etu): ?>
                    <tr>
                        <td><?= $i + 1 ?></td>
                        <td><?= e($etu['prenom'] . ' ' . $etu['nom']) ?></td>
                        <td><strong><?= $etu['points'] ?></strong></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <a href="index.php?page=leaderboard" class="btn btn-secondary">Classement complet</a>
    </div>
</div>
