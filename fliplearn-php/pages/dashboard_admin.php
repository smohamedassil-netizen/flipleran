<?php
require_role(['admin']);
$db = getDB();

// Stats
$stmt = $db->query("SELECT role, COUNT(*) as total FROM users GROUP BY role");
$roleCounts = [];
while ($row = $stmt->fetch()) {
    $roleCounts[$row['role']] = $row['total'];
}

$stmt = $db->query("SELECT COUNT(*) as total FROM courses");
$totalCourses = $stmt->fetch()['total'];

// Derniers inscrits
$stmt = $db->query("SELECT nom, prenom, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10");
$recentUsers = $stmt->fetchAll();
?>

<h1>Administration</h1>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-number"><?= $roleCounts['etudiant'] ?? 0 ?></div>
        <div class="stat-label">&Eacute;tudiants</div>
    </div>
    <div class="stat-card">
        <div class="stat-number"><?= $roleCounts['professeur'] ?? 0 ?></div>
        <div class="stat-label">Professeurs</div>
    </div>
    <div class="stat-card">
        <div class="stat-number"><?= $totalCourses ?></div>
        <div class="stat-label">Cours</div>
    </div>
    <div class="stat-card">
        <div class="stat-number"><?= array_sum($roleCounts) ?></div>
        <div class="stat-label">Total utilisateurs</div>
    </div>
</div>

<div class="section-header">
    <h2>Derniers inscrits</h2>
    <a href="index.php?page=admin_users" class="btn btn-primary">G&eacute;rer les utilisateurs</a>
</div>

<table class="table">
    <thead>
        <tr><th>Nom</th><th>Email</th><th>R&ocirc;le</th><th>Date</th></tr>
    </thead>
    <tbody>
        <?php foreach ($recentUsers as $u): ?>
            <tr>
                <td><?= e($u['prenom'] . ' ' . $u['nom']) ?></td>
                <td><?= e($u['email']) ?></td>
                <td><span class="badge badge-<?= $u['role'] ?>"><?= e(ucfirst($u['role'])) ?></span></td>
                <td><?= date('d/m/Y', strtotime($u['created_at'])) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
