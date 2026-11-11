/*
  Verstuurt het contactformulier op de achtergrond naar Formspree, zodat de
  bezoeker op deze pagina blijft in plaats van op de bedankpagina van
  Formspree te belanden (een eigen bedankpagina bij Formspree instellen kan
  alleen met een betaald abonnement).

  Werkt het script niet - JavaScript uit, oude browser - dan gebeurt er niets
  bijzonders: het formulier verstuurt zichzelf dan gewoon op de klassieke
  manier. De bezoeker ziet dan wel de pagina van Formspree, maar zijn bericht
  komt hoe dan ook aan. Dat is belangrijker dan de opmaak.

  Dit staat in een eigen bestand en niet meer in de pagina zelf, omdat de
  Content-Security-Policy (zie layouts/_partials/head.html) scripts die in de
  pagina geschreven staan niet uitvoert. Het wordt geladen door de shortcode
  contactformulier-script in content/contact/_index.md.
*/
(function () {
  var formulier = document.querySelector(".contact-form");
  var melding = document.getElementById("formulier-status");
  if (!formulier || !melding || !window.fetch || !window.FormData) return;

  var knop = formulier.querySelector('button[type="submit"]');
  var knopTekst = knop ? knop.textContent : "";
  var TELEFOON = "06 26 810 089";

  // De melding wordt als platte tekst opgebouwd, niet als HTML. De fouttekst
  // komt van Formspree, dus van buiten; zo kan daar nooit opmaak of script
  // in meekomen.
  function toonMelding(soort, kop, tekst) {
    melding.className = "form-melding form-melding--" + soort;
    melding.textContent = "";
    var sterk = document.createElement("strong");
    sterk.textContent = kop;
    melding.appendChild(sterk);
    melding.appendChild(document.createElement("br"));
    melding.appendChild(document.createTextNode(tekst));
    melding.hidden = false;
    melding.focus();
  }

  function knopHerstellen() {
    if (!knop) return;
    knop.disabled = false;
    knop.textContent = knopTekst;
  }

  formulier.addEventListener("submit", function (gebeurtenis) {
    gebeurtenis.preventDefault();
    melding.hidden = true;
    if (knop) {
      knop.disabled = true;
      knop.textContent = "Bezig met versturen…";
    }

    fetch(formulier.action, {
      method: "POST",
      body: new FormData(formulier),
      headers: { Accept: "application/json" }
    })
      .then(function (antwoord) {
        return antwoord
          .json()
          .catch(function () { return {}; })
          .then(function (gegevens) {
            return { gelukt: antwoord.ok, gegevens: gegevens };
          });
      })
      .then(function (resultaat) {
        if (resultaat.gelukt) {
          formulier.hidden = true;
          toonMelding(
            "goed",
            "Bedankt voor uw bericht.",
            "Ik neem zo snel mogelijk contact met u op."
          );
          return;
        }
        var fouten = (resultaat.gegevens.errors || [])
          .map(function (fout) { return fout.message; })
          .join(" ");
        knopHerstellen();
        toonMelding(
          "fout",
          "Het versturen is niet gelukt.",
          (fouten ? fouten + " " : "") +
            "Probeert u het nog eens, of bel / app " + TELEFOON +
            ". Uw tekst staat nog in het formulier."
        );
      })
      .catch(function () {
        knopHerstellen();
        toonMelding(
          "fout",
          "Het versturen is niet gelukt.",
          "Controleer uw internetverbinding en probeer het nog eens, of bel / app " +
            TELEFOON + ". Uw tekst staat nog in het formulier."
        );
      });
  });
})();
