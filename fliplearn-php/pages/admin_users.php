<?php
require_role(['admin']);
$db = getDB();

$success = $_GET['success'] ?? '';

// Filtrer par role
$roleFilter = $_GET['role'] ?? '';
if ($roleFilter && in_array($roleFilter, ['etudiant', 'professeur', 'admin'])) {
    $stmt = $db->prepare("SELECT * FROM users WHERE role = ? ORDER BY created_at DESC");
    $stmt->execute([$roleFilter]);
} else {
    $stmt = $db->query("SELECT * FROM users ORDER BY created_at DESC");
}
$users = $stmt->fetchAll();
?>

<h1>Gestion des utilisateurs</h1>

<?php if ($success): ?>
    <div class="alert alert-success"><?= e($success) ?></div>
<?php endif; ?>

<div class="filters">
    <a href="index.php?page=admin_users" class="btn btn-small <?= !$roleFilter ? 'active' : '' ?>">Tous (<?= count($users) ?>)</a>
    <a href="index.php?page=admin_users&role=etudiant" class="btn btn-small <?= $roleFilter === 'etudiant' ? 'active' : '' ?>">&Eacute;tudiants</a>
    <a href="index.php?page=admin_users&role=professeur" class="btn btn-small <?= $roleFilter === 'professeur' ? 'active' : '' ?>">Professeurs</a>
    <a href="index.php?page=admin_users&role=admin" class="btn btn-small <?= $roleFilter === 'admin' ? 'active' : '' ?>">Admins</a>
</div>

<table class="table">
    <thead>
        <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>R&ocirc;le</th>
            <th>Fili&egrave;re</th>
            <th>Statut</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($users as $u): ?>
            <tr>
                <td><?= e($u['prenom'] . ' ' . $u['nom']) ?></td>
                <td><?= e($u['email']) ?></td>
                <td><span class="badge badge-<?= $u['role'] ?>"><?= e(ucfirst($u['role'])) ?></span></td>
                <td><?= e($u['filiere']) ?></td>
                <td>
                    <?php if ($u['is_active']): ?>
                        <span class="badge badge-active">Actif</span>
                    <?php else: ?>
                        <span class="badge badge-inactive">Inactif</span>
                    <?php endif; ?>
                </td>
                <td>
                    <?php if ($u['id'] != $_SESSION['user_id']): ?>
                        <form action="actions/admin_user_action.php" method="POST" style="display:inline">
                            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
                            <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                            <input type="hidden" name="action" value="toggle_active">
                            <button type="submit" class="btn btn-small"><?= $u['is_active'] ? 'D&eacute;sactiver' : 'Activer' ?></button>
                        </form>
                        <form action="actions/admin_user_action.php" method="POST" style="display:inline" onsubmit="return confirm('Supprimer cet utilisateur ?')">
                            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">
                            <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                            <input type="hidden" name="action" value="delete">
                            <button type="submit" class="btn btn-small btn-danger">Supprimer</button>
                        </form>
                    <?php else: ?>
                        <span class="text-muted">Vous</span>
                    <?php endif; ?>
                </td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
