---
layout: "simple"
kopfoto: "img/kop-rietzanger.jpg"
kopfoto_alt: "Zingende rietzanger in een rietkraag"
# Houdt het onderwerp in beeld als de band smaller wordt dan de foto.
kopfoto_positie: "70% 50%"
kopregel: "Weet binnen een minuut wat een voortoets voor uw project kost."
title: "Voortoets"
description: "Bereken direct wat een voortoets stikstof kost: sleep uw AERIUS-berekening in de teller"
weight: 0
---

Heeft uw project een berekende toename van stikstofdepositie op een Natura 2000-gebied, dan is een voortoets nodig. Wat die kost, hangt af van één ding: hoeveel habitattypen en leefgebieden er beoordeeld moeten worden. Dat aantal staat niet in uw AERIUS-rapport, maar het valt er wel uit af te leiden.

Deze teller doet dat. Sleep uw AERIUS-projectberekening hieronder in het vak en u ziet binnen een minuut om welke habitattypen het gaat, in welke gebieden, en wat de voortoets kost.

{{< voortoetsteller >}}

## Wat de teller doet

Uw AERIUS-PDF bevat als bijlage de rekentaak zelf — hetzelfde bestand dat Calculator inleest bij het importeren van een PDF. Daar staan alle rekenpunten in met hun projectbijdrage. Welke habitattypen op die punten liggen staat er níet in; dat komt uit de open data van AERIUS.

De teller combineert die twee. Per Natura 2000-gebied en per habitattype wordt gekeken naar de hexagonen waarop een toename is berekend, en daaruit wordt het hexagoon met de hoogste achtergronddepositie genomen. Ligt die boven of dicht onder de kritische depositiewaarde, dan moet dat type behandeld worden en telt het mee.

Een paar keuzes die daarin zitten:

- Leefgebieden tellen even zwaar als habitattypen. De beoordeling is niet minder werk.
- Hetzelfde type in twee gebieden telt als twee eenheden, want het zijn twee beoordelingen.
- Een zoekgebied (ZG) telt niet apart mee als het bijbehorende hoofdtype al behandeld wordt.
- Een toename telt vanaf 0,005 mol N/ha/j, want AERIUS rondt af op honderdsten.

## Uw bestand blijft van u

De berekening draait volledig in uw eigen browser. De PDF wordt niet geüpload en komt nergens op een server terecht — ook niet op die van mij. Het enige verkeer naar buiten is een vraag aan de open data van AERIUS: welke habitattypen liggen op deze hexagonen, en wat is daar de achtergronddepositie. Daarbij gaan alleen hexagoonnummers de deur uit, geen projectgegevens.

Pas als u zelf op *Offerte aanvragen* klikt, wordt er iets verstuurd — en dan alleen wat u op dat moment op uw scherm ziet staan.

## Waar u op moet letten

De teller is geijkt op **AERIUS 2025.3** en gecontroleerd op twee volledig uitgewerkte projecten. Rekent u met een andere versie, dan krijgt u een waarschuwing te zien: hexagoonnummers en habitatkaarten verschillen per AERIUS-release.

Het bedrag is een indicatie, geen offerte. Het is berekend op het aantal te behandelen typen en houdt geen rekening met wat uw project verder eigen maakt — een ingewikkelde saldering, een krappe planning, of een gebied waar de gegevens vragen oproepen. Voor dat gesprek is de offerteknop er.

Loopt u ergens tegenaan, of geeft de teller iets terug dat u niet verwacht? [Laat het me weten](../contact/) — juist die gevallen maken de teller beter.
