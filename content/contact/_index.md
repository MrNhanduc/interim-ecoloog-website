---
layout: "simple"
kopregel: "Bel, mail of gebruik het formulier - u krijgt zo snel mogelijk een reactie."
title: "Contact"
description: "Neem contact op met De Interim Ecoloog"
kopfoto: "img/kop-patrijs.jpg"
kopfoto_alt: "Patrijs in ruige vegetatie"
# Houdt het onderwerp in beeld als de band smaller wordt dan de foto.
kopfoto_positie: "62% 50%"
weight: 4
---

Wilt u een offerte aanvragen of heeft u een andere vraag? Neem dan contact op via onderstaand contactformulier, bel / app 06 26 810 089, of stuur een mail naar [info@deinterimecoloog.nl](mailto:info@deinterimecoloog.nl). U krijgt zo snel mogelijk een reactie.

<!--
Dit formulier gebruikt Formspree (formspree.io), omdat GitHub Pages
alleen statische bestanden serveert en dus zelf geen formulier kan
verwerken. Het gratis abonnement staat 50 inzendingen per maand toe.

Het endpoint hieronder hoort bij het Formspree-formulier van
De Interim Ecoloog. Wil je later naar een ander formulier, dan is dit
de enige regel die je hoeft aan te passen.

De name-attributen hieronder zijn met opzet Engels: Formspree herkent
name, email, phone, subject en message en gebruikt ze om de melding
op te maken (het e-mailadres wordt het antwoordadres, het onderwerp
de onderwerpregel). Met eigen namen als "naam" of "bericht" komt alles
als een naamloze lijst binnen. De labels die de bezoeker ziet, zijn
gewoon Nederlands - die staan los van de veldnamen.
-->

<!--
  Meldingsvak. Blijft leeg en verborgen tot het formulier verstuurd is.
  role="status" en aria-live zorgen dat een schermlezer de melding voorleest;
  tabindex="-1" maakt het mogelijk de aandacht ernaartoe te verplaatsen.
-->
<div id="formulier-status" role="status" aria-live="polite" tabindex="-1" hidden></div>

<form action="https://formspree.io/f/xaeyjzbw" method="POST" class="contact-form">
  <div class="form-row">
    <div class="form-field">
      <label for="naam">Naam</label>
      <input id="naam" name="name" type="text" placeholder="Voor- en achternaam" required>
    </div>
    <div class="form-field">
      <label for="email">E-mailadres</label>
      <input id="email" name="email" type="email" placeholder="naam@voorbeeld.nl" required>
    </div>
  </div>

  <div class="form-row">
    <div class="form-field">
      <label for="tel">Telefoonnummer <span class="optional">(optioneel)</span></label>
      <input id="tel" name="phone" type="tel" placeholder="06 12 34 56 78">
    </div>
    <div class="form-field">
      <label for="onderwerp">Onderwerp</label>
      <input id="onderwerp" name="subject" type="text" placeholder="Bijv. quickscan of offerte">
    </div>
  </div>

  <div class="form-field form-field--full">
    <label for="bericht">Uw bericht</label>
    <textarea id="bericht" name="message" placeholder="Vertel kort waar uw project om gaat..." required></textarea>
  </div>

  <!-- honeypot-veld tegen spam, onzichtbaar voor bezoekers -->
  <input type="text" name="_gotcha" style="display:none">

  <p class="privacy-note">Uw gegevens worden alleen gebruikt om contact met u op te nemen en nooit gedeeld met derden.</p>

  <button type="submit">Bericht versturen</button>
</form>


<script>
  /*
    Verstuurt het contactformulier op de achtergrond naar Formspree, zodat de
    bezoeker op deze pagina blijft in plaats van op de bedankpagina van
    Formspree te belanden (een eigen bedankpagina bij Formspree instellen kan
    alleen met een betaald abonnement).

    Werkt het script niet - JavaScript uit, oude browser - dan gebeurt er niets
    bijzonders: het formulier verstuurt zichzelf dan gewoon op de klassieke
    manier. De bezoeker ziet dan wel de pagina van Formspree, maar zijn bericht
    komt hoe dan ook aan. Dat is belangrijker dan de opmaak.
  */
  (function () {
    var formulier = document.querySelector(".contact-form");
    var melding = document.getElementById("formulier-status");
    if (!formulier || !melding || !window.fetch || !window.FormData) return;

    var knop = formulier.querySelector('button[type="submit"]');
    var knopTekst = knop ? knop.textContent : "";
    var TELEFOON = "06 26 810 089";

    function toonMelding(soort, kop, tekst) {
      melding.className = "form-melding form-melding--" + soort;
      melding.innerHTML = "<strong>" + kop + "</strong><br>" + tekst;
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
        knop.textContent = "Bezig met versturen\u2026";
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
</script>
