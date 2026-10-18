# Solveur Sanctuaire des Jardins éternels

Site statique (HTML/JS, sans serveur). Ouvrir `index.html` dans un navigateur.

- `solveurs.js` : logique et données du raid (tables objets/maps, statues, couleurs).
- `app.js` : interface. `style.css` : mise en forme.
- L'état est gardé dans le navigateur ; « Copier le lien de partage » encode tout dans l'URL.

Hébergement gratuit possible : GitHub Pages, Netlify ou Cloudflare Pages (déposer les 4 fichiers).

## Sessions de raid partagées

Plusieurs joueurs peuvent remplir le solveur en même temps : « Créer une session » donne un ID à partager
(ou le lien `?raid=ID`). La synchro passe par une base Firebase Realtime Database (offre gratuite),
dont l'adresse se met dans `config.js`. Règles de la base :

```json
{
  "rules": {
    "sessions": {
      "$id": {
        ".read": "$id.matches(/^[A-Z0-9]{4,12}$/)",
        ".write": "$id.matches(/^[A-Z0-9]{4,12}$/)"
      }
    }
  }
}
```
