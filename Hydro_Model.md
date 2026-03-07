Ich baue ein interaktives Modell, das alle Abhängigkeiten visualisiert und in Echtzeit die Kaskaden-Effekte zeigt.​​​​​​​​​​​​​​​​

Das interaktive Modell ist fertig. Hier eine Übersicht der wichtigsten Funktionen in drei Sprachen:

🇩🇪 Deutsch — Was das Modell zeigt
Das Modell visualisiert alle gegenseitigen Abhängigkeiten in Echtzeit. Sobald Sie einen Schalter betätigen — z.B. die Nährstoffpumpe einschalten oder die Temperatur erhöhen — werden im Graphen die betroffenen Parameter farblich hervorgehoben und die Kaskade (Ursache → Wirkung) im Protokoll links unten festgehalten.
Die sieben Parameter sind vollständig vernetzt: Temperatur, pH, EC (Nährstoffe), Wasserstand, CO₂/Luftqualität, Nährstoffverfügbarkeit und Pflanzenaufnahme. Die gestrichelten Pfeile im Graphen zeigen grün (verstärkender Einfluss), rot (abschwächender Einfluss) oder lila (kurvenförmiger pH-Effekt).
Rechts berechnet das Modell einen System-Gesundheitswert in Echtzeit und zeigt Alarme bei Parametern außerhalb des Optimums.

🇫🇷 Français — Résumé
Le modèle montre toutes les dépendances croisées en temps réel. Chaque action sur les pompes, la température ou le CO₂ déclenche une cascade visible dans le graphe avec un code couleur (vert = influence positive, rouge = négative, violet = effet courbe pH). Un journal de modifications et un score de santé global complètent l’interface.

🇬🇧 English — Summary
The model computes cross-parameter physics in real-time: activating the nutrient pump raises EC, which then affects nutrient availability depending on pH, which cascades into plant uptake and water level. Temperature changes propagate through pH and evaporation simultaneously. All seven parameters are linked, and the dependency graph highlights the active cascade path for 3 seconds after each control change.​​​​​​​​​​​​​​​​