# Srovnání e-shopových platforem

Kalkulačka nákladů a funkční srovnání e-shopových platforem pro obchodníky v CZ, SK a EU.
Autor: [Pavel Vranka](https://pavelvranka.cz). Ceny naposledy ověřeny 31. 10. 2026, bez DPH.

Jeden zdroj, dva výstupy:

| Výstup | K čemu | Kde |
|---|---|---|
| Samostatná HTML stránka | nahrát kamkoli jako statický soubor | `dist/srovnani-platforem.html` |
| WordPress plugin | vložit do stránky shortcodem `[srovnani_platforem]` | `dist/srovnani-platforem-<verze>.zip` |

Obojí vzniká buildem (`python3 build.py`), složka `dist/` se do gitu necommituje.

## Struktura

```
build.py            build: verze, datum ověření cen, manifest souborů pluginu
src/
  content.html      obsah: ovládání kalkulačky + statické tabulky (indexovatelné HTML)
  kalkulacka.js     výpočet a vykreslení kalkulačky, ceník v objektu PRICE
  kalkulacka.css    minimální styly omezené na .pv-kalk
  page.html         šablona samostatné stránky (meta, JSON-LD, základní styl)
wordpress-plugin/
  srovnani-platforem.php   kód pluginu (shortcode, assety, SEO napojení)
  readme.txt               popis pluginu pro WordPress
```

## Build

```bash
python3 build.py
```

Potřebuje jen Python 3.8+. Výstup:

```
dist/srovnani-platforem.html
dist/srovnani-platforem/                 rozbalený plugin
dist/srovnani-platforem-<verze>.zip      plugin k nahrání
```

Co a kam se do pluginu zabalí, určuje seznam `PLUGIN_FILES` v `build.py`. Soubory `index.php`
a `.htaccess` (ochrana adresářů) vytváří build sám (`GENERATED`). Verzi a datum ověření cen
nastavíte jen v `build.py` (`VERSION`, `UPDATED`); build je dosadí do všech souborů místo
zástupných textů `{{VERSION}}`, `{{UPDATED}}` a `{{UPDATED_CZ}}`.

## Aktualizace cen

1. Čísla pro výpočet: objekt `PRICE` a pole `P`, `NATIVE` v `src/kalkulacka.js`.
2. Texty a tabulky: `src/content.html` (platební brány, funkční srovnání, předpoklady).
3. V `build.py` nastavte `UPDATED` na datum ověření a zvyšte `VERSION`.
4. `python3 build.py`, commit, nahrát nový ZIP do WordPressu.

Hodnoty, které nevycházejí z veřejného ceníku, nesou štítek **odhad**, minimální ceny štítek **od**.

## WordPress

1. Nahrajte `dist/srovnani-platforem-<verze>.zip` přes *Pluginy → Přidat nový → Nahrát plugin* a aktivujte.
2. Do stránky vložte shortcode `[srovnani_platforem]` (blok Shortcode, v page builderu widget Shortcode).
3. Nadpis H1 dává stránka WordPressu, obsah pluginu začíná na úrovni H2.

Aktualizace: nahrajte nový ZIP (WordPress nabídne nahrazení), nebo nasazujte automaticky přes
GitHub Actions: `python3 build.py` a SFTP upload složky `dist/srovnani-platforem/` do
`wp-content/plugins/`.

Barvy grafu a štítků lze přepsat v CSS šablony:

```css
.pv-kalk { --pvk-lic: #123456; --pvk-mkt: #ff6600; }
```

## Bezpečnost

- Plugin nepřijímá vstupy od návštěvníků ani atributy shortcodu, nic neukládá, nemá nastavení,
  AJAX ani REST endpointy a nenačítá nic z externích zdrojů.
- Vypisuje jen statickou šablonu dodanou s pluginem; přímý přístup k souborům brání `index.php`
  a `.htaccess` ve složce šablon.
- Kalkulačka vykresluje výsledky přes DOM API (`textContent`), nevkládá HTML řetězce.
- Assety se načítají jen na stránkách se shortcodem.

## SEO

- Srovnání funkcí, platební brány, startovací řešení, doporučení i předpoklady jsou v HTML,
  vyhledávače je indexují bez JavaScriptu. Dynamická je jen kalkulačka.
- Samostatná stránka má meta description, autora a JSON-LD s datem úpravy. Při nasazení doplňte
  `<link rel="canonical">` na adresu, kde stránka poběží. Pokud běží zároveň samostatná stránka
  i stránka s pluginem, canonical obou by měl mířit na jednu z nich.

### SEO v pluginu

Plugin po načtení všech pluginů zjistí, který SEO plugin je aktivní, a podle toho se zapojí:

| Na webu běží | Co plugin udělá na stránce s kalkulačkou |
|---|---|
| Yoast SEO | doplní do uzlu WebPage autora, datum ověření cen (`dateModified`) a téma; prázdný meta popis nahradí výchozím |
| Rank Math | totéž přes filtr `rank_math/json_ld` a `rank_math/frontend/description` |
| SEOPress, AIOSEO, The SEO Framework | nic, aby nevznikly duplicity |
| žádný SEO plugin | vypíše meta description a JSON-LD sám |

`dateModified` je novější z data ověření cen (`UPDATED` v `build.py`) a data úpravy stránky.
Ručně nastavený meta popis v SEO pluginu má vždy přednost.

Pokud page builder neukládá shortcode do obsahu stránky a plugin stránku nepozná:

```php
add_filter( 'pvsp_is_calc_page', function ( $is ) { return $is || is_page( 'srovnani-platforem' ); } );
```

## Licence

GPL-2.0-or-later (plugin pro WordPress).
