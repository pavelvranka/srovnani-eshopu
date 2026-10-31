=== Srovnání e-shopových platforem ===
Contributors: pavelvranka
Tags: e-commerce, kalkulačka, srovnání, shopify, shoptet
Requires at least: 6.3
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: {{VERSION}}
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Kalkulačka nákladů a funkční srovnání e-shopových platforem pro CZ, SK a EU.

== Description ==

Vložte shortcode [srovnani_platforem] do libovolné stránky (blok Shortcode v Gutenbergu, widget Shortcode v page builderu).

* Obsah (srovnání funkcí, platební brány, předpoklady) se vykresluje jako běžné HTML, takže ho vyhledávače indexují jako součást stránky.
* Kalkulačka běží v prohlížeči návštěvníka, nic neodesílá a nenačítá z externích zdrojů.
* Styly jsou minimální a omezené na blok kalkulačky, písmo a barvy se přebírají ze šablony webu.
* Plugin nic neukládá do databáze a nemá žádné nastavení.
* SEO: plugin sám pozná, jestli běží Yoast SEO nebo Rank Math, a doplní do jejich strukturovaných dat autora, datum ověření cen a téma stránky. Prázdný meta popis doplní výchozím textem. Bez SEO pluginu vypíše meta description a JSON-LD sám, při jiném SEO pluginu (SEOPress, AIOSEO, The SEO Framework) nevypisuje nic, aby nevznikly duplicity.
* Page buildery, které shortcode neukládají do obsahu stránky, mohou stránku označit filtrem: add_filter( 'pvsp_is_calc_page', '__return_true' );

Barvy grafu a štítků lze přepsat v CSS šablony, např.:

.pv-kalk { --pvk-lic: #123456; --pvk-mkt: #ff6600; }

== Changelog ==

= 1.1.0 =
* Napojení na Yoast SEO a Rank Math, záložní meta description a JSON-LD bez SEO pluginu.

= 1.0.0 =
* První verze. Ceny ověřeny k 31. 10. 2026.
