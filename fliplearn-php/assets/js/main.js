// FlipLearn - JS principal
// Fonctions utilitaires globales

// Fermer le menu mobile quand on clique sur un lien
document.querySelectorAll('.navbar-menu a').forEach(function(link) {
    link.addEventListener('click', function() {
        document.querySelector('.navbar-menu').classList.remove('active');
    });
});
