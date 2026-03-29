<?php
$error = $_GET['error'] ?? '';
?>

<div class="auth-container">
    <div class="auth-card">
        <h1>Inscription</h1>
        <p class="auth-subtitle">Rejoignez FlipLearn</p>

        <?php if ($error): ?>
            <div class="alert alert-error"><?= e($error) ?></div>
        <?php endif; ?>

        <form action="actions/register_action.php" method="POST">
            <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>">

            <div class="form-row">
                <div class="form-group">
                    <label for="nom">Nom</label>
                    <input type="text" id="nom" name="nom" required placeholder="Votre nom">
                </div>
                <div class="form-group">
                    <label for="prenom">Pr&eacute;nom</label>
                    <input type="text" id="prenom" name="prenom" required placeholder="Votre pr&eacute;nom">
                </div>
            </div>

            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="votre@email.com">
            </div>

            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input type="password" id="password" name="password" required minlength="6" placeholder="Minimum 6 caract&egrave;res">
            </div>

            <div class="form-group">
                <label for="role">Vous &ecirc;tes</label>
                <select id="role" name="role" required>
                    <option value="etudiant">&Eacute;tudiant</option>
                    <option value="professeur">Professeur</option>
                </select>
            </div>

            <div class="form-group">
                <label for="filiere">Fili&egrave;re</label>
                <input type="text" id="filiere" name="filiere" placeholder="Ex: Informatique, Math&eacute;matiques...">
            </div>

            <div class="form-group">
                <label for="promotion">Promotion</label>
                <input type="text" id="promotion" name="promotion" placeholder="Ex: 2024-2025">
            </div>

            <button type="submit" class="btn btn-primary btn-full">S'inscrire</button>
        </form>

        <p class="auth-link">
            D&eacute;j&agrave; un compte ? <a href="index.php?page=login">Se connecter</a>
        </p>
    </div>
</div>
