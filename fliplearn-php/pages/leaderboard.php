<?php
$db = getDB();

$stmt = $db->query("SELECT nom, prenom, points, filiere, promotion FROM users WHERE role = 'etudiant' AND is_active = 1 ORDER BY points DESC LIMIT 50");
$students = $stmt->fetchAll();
?>

<h1>Classement des &eacute;tudiants</h1>

<?php if (empty($students)): ?>
    <p class="text-muted">Aucun &eacute;tudiant inscrit.</p>
<?php else: ?>
    <table class="table">
        <thead>
            <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Fili&egrave;re</th>
                <th>Points</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($students as $i => $s): ?>
                <tr class="<?= $i < 3 ? 'top-' . ($i + 1) : '' ?> <?= (isset($_SESSION['user_id']) && $s['prenom'] . ' ' . $s['nom'] === $_SESSION['prenom'] . ' ' . $_SESSION['nom']) ? 'is-me' : '' ?>">
                    <td>
                        <?php if ($i === 0): ?>
                            <span class="medal gold">1</span>
                        <?php elseif ($i === 1): ?>
                            <span class="medal silver">2</span>
                        <?php elseif ($i === 2): ?>
                            <span class="medal bronze">3</span>
                        <?php else: ?>
                            <?= $i + 1 ?>
                        <?php endif; ?>
                    </td>
                    <td><?= e($s['prenom'] . ' ' . $s['nom']) ?></td>
                    <td><?= e($s['filiere']) ?></td>
                    <td><strong><?= $s['points'] ?></strong> pts</td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
<?php endif; ?>
