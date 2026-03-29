<?php
session_start();
session_destroy();
header('Location: ../index.php?page=login&success=' . urlencode('Vous avez &eacute;t&eacute; d&eacute;connect&eacute;.'));
exit;
