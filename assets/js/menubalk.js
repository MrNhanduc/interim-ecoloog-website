/*
  Geeft de menubalk een achtergrond zodra je voorbij de kopband scrollt.
  Zonder dit zweeft witte tekst over crème zodra de band uit beeld is.
  Werkt de JavaScript niet, dan blijft de balk gewoon doorzichtig staan -
  hij verdwijnt nooit, want dat regelt de CSS.

  Wordt geladen vanuit layouts/_partials/extend-footer.html. Het staat in een
  eigen bestand omdat de Content-Security-Policy scripts die in de pagina
  geschreven staan niet uitvoert.
*/
(function () {
  var balk = document.querySelector('body > header');
  if (!balk) return;
  var grens = 80;
  var bezig = false;
  function bijwerken() {
    balk.classList.toggle('is-geplakt', window.scrollY > grens);
    bezig = false;
  }
  addEventListener('scroll', function () {
    if (bezig) return;
    bezig = true;
    requestAnimationFrame(bijwerken);
  }, { passive: true });
  bijwerken();
})();
