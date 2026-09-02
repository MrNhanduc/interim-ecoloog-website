---
layout: "simple"
title: "Contact"
description: "Neem contact op met De Interim Ecoloog"
weight: 4
---

Wilt u een offerte aanvragen of heeft u een andere vraag? Neem dan contact op via onderstaand contactformulier of bel / app 06 26 810 089. U krijgt zo snel mogelijk een reactie.

<!--
Dit formulier gebruikt Formspree (formspree.io) omdat GitHub Pages
alleen statische bestanden host en dus geen formulier kan verwerken.
Formspree heeft een gratis laag (50 verzendingen/maand) en werkt
zonder eigen server. Vervang YOUR_FORM_ID hieronder door je eigen
form-ID nadat je een gratis account hebt aangemaakt op formspree.io.
-->

<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" class="contact-form">
  <div class="form-row">
    <div class="form-field">
      <label for="naam">Naam</label>
      <input id="naam" name="naam" type="text" placeholder="Voor- en achternaam" required>
    </div>
    <div class="form-field">
      <label for="email">E-mailadres</label>
      <input id="email" name="_replyto" type="email" placeholder="naam@voorbeeld.nl" required>
    </div>
  </div>

  <div class="form-row">
    <div class="form-field">
      <label for="tel">Telefoonnummer <span class="optional">(optioneel)</span></label>
      <input id="tel" name="telefoonnummer" type="tel" placeholder="06 12 34 56 78">
    </div>
    <div class="form-field">
      <label for="onderwerp">Onderwerp</label>
      <input id="onderwerp" name="onderwerp" type="text" placeholder="Bijv. quickscan of offerte">
    </div>
  </div>

  <div class="form-field form-field--full">
    <label for="bericht">Uw bericht</label>
    <textarea id="bericht" name="bericht" placeholder="Vertel kort waar uw project om gaat..." required></textarea>
  </div>

  <!-- honeypot-veld tegen spam, onzichtbaar voor bezoekers -->
  <input type="text" name="_gotcha" style="display:none">

  <p class="privacy-note">Uw gegevens worden alleen gebruikt om contact met u op te nemen en nooit gedeeld met derden.</p>

  <button type="submit">Bericht versturen</button>
</form>
