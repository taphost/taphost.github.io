// Script per effetti dinamici
document.addEventListener('DOMContentLoaded', function() {
    // Aggiunge un effetto hover sonoro (opzionale)
    const linkCards = document.querySelectorAll('.link-card');
    linkCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Qui si potrebbe aggiungere un suono per l'hover, se disponibile.
            // Esempio: new Audio('path/to/sound.mp3').play();
        });
    });
});
