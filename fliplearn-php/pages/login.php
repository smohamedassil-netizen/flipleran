<?php
$error = $_GET['error'] ?? '';
$success = $_GET['success'] ?? '';
?>

<div class="auth-container">
    <div class="auth-card">
        <h1>Connexion</h1>
        <p class="auth-subtitle">Bienvenue sur FlipLearn</p>

        <?php if ($error): ?>
            <div class="alert alert-error"><?= e($error) ?></div>
        <?php endif; ?>
        <?php if ($success): ?>
            <div class="alert alert-success"><?= e($success) ?></div>
        <?php endif; ?>

        <form action="actions/login_action.php" method="POST">
            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">

            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="votre@email.com">
            </div>

            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input type="password" id="password" name="password" required placeholder="Votre mot de passe">
            </div>

            <button type="submit" class="btn btn-primary btn-full">Se connecter</button>
        </form>

        <p class="auth-link">
            Pas encore de compte ? <a href="index.php?page=register">S'inscrire</a>
        </p>
    </div>
</div>
