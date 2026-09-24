# Sloth Dev

my website. hosted on github pages, has all my stuff in one place.

**https://sloth-dev-web.github.io**

## what's on here

**MIDI Players**
- **Web From Above** — Piano From Above but it runs in your browser. load a MIDI, pick a soundfont, watch the black midi render.
- **Kiva Patched** — windows only, linked out to [that repo](https://github.com/SlothPlayer2241/Kiva-Patched). cut down kiva for laptops that choke on the original

**Minigames**
snake, clicker, 2048, coin flip, flappy bird, flutter fox (cursor trail thing), and a python learning app i made for practice

**wallpapers**
a few game screenshots in the `Wallpapers` folder. take them if you want.

## running it locally

just open `index.html`. no build step, no npm, no nothing. it's static html/css/js.

if you wanna mess with Web From Above specifically, serve the folder so ES modules load:

```
cd "MIDI Players/Web From Above"
npx serve .
```

## notes

- Web From Above has its own README with the feature list and credits (brian pantano made the original PFA, go thank him)
- settings/soundfonts are stored in your browser localStorage, nothing gets sent anywhere
- if something's broken open an issue or dm me on discord: `slothplayer_best_`

## license

no license "yet"
