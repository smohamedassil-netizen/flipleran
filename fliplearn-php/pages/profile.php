<?php
$db = getDB();
$success = $_GET['success'] ?? '';
$error = $_GET['error'] ?? '';

$stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();
?>

<h1>Mon profil</h1>

<?php if ($success): ?>
    <div class="alert alert-success"><?= e($success) ?></div>
<?php endif; ?>
<?php if ($error): ?>
    <div class="alert alert-error"><?= e($error) ?></div>
<?php endif; ?>

<form action="actions/profile_action.php" method="POST" class="form-card">
    <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">

    <div class="form-row">
        <div class="form-group">
            <label for="nom">Nom</label>
            <input type="text" id="nom" name="nom" required value="<?= e($user['nom']) ?>">
        </div>
        <div class="form-group">
            <label for="prenom">Pr&eacute;nom</label>
            <input type="text" id="prenom" name="prenom" required value="<?= e($user['prenom']) ?>">
        </div>
    </div>

    <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required value="<?= e($user['email']) ?>">
    </div>

    <div class="form-row">
        <div class="form-group">
            <label for="filiere">Fili&egrave;re</label>
            <input type="text" id="filiere" name="filiere" value="<?= e($user['filiere']) ?>">
        </div>
        <div class="form-group">
            <label for="promotion">Promotion</label>
            <input type="text" id="promotion" name="promotion" value="<?= e($user['promotion']) ?>">
        </div>
    </div>

    <div class="form-group">
        <label>R&ocirc;le</label>
        <input type="text" value="<?= e(ucfirst($user['role'])) ?>" disabled>
    </div>

    <?php if ($user['role'] === 'etudiant'): ?>
        <div class="form-group">
            <label>Points</label>
            <input type="text" value="<?= $user['points'] ?>" disabled>
        </div>
    <?php endif; ?>

    <h2>Changer le mot de passe</h2>
    <div class="form-group">
        <label for="current_password">Mot de passe actuel</label>
        <input type="password" id="current_password" name="current_password" placeholder="Laissez vide pour ne pas changer">
    </div>
    <div class="form-group">
        <label for="new_password">Nouveau mot de passe</label>
        <input type="password" id="new_password" name="new_password" minlength="6" placeholder="Minimum 6 caract&egrave;res">
    </div>

    <div class="form-actions">
        <button type="submit" class="btn btn-primary">Mettre &agrave; jour</button>
    </div>
</form>
