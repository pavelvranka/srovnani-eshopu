<?php
/**
 * Plugin Name:       Srovnání e-shopových platforem
 * Description:       Kalkulačka nákladů a funkční srovnání e-shopových platforem. Vložte shortcode [srovnani_platforem] do stránky.
 * Version:           {{VERSION}}
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            Pavel Vranka
 * Author URI:        https://pavelvranka.cz
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       srovnani-platforem
 *
 * Bezpečnost:
 * - plugin nepřijímá žádné vstupy od návštěvníků ani parametry shortcodu,
 * - neukládá nic do databáze, nemá nastavení, AJAX ani REST endpointy,
 * - nenačítá nic z externích zdrojů, vše je součástí pluginu,
 * - vypisuje jen statickou šablonu dodanou s pluginem.
 *
 * SEO: na stránce s kalkulačkou doplní strukturovaná data (autor, datum
 * ověření cen, téma) do výstupu Yoast SEO nebo Rank Math. Bez SEO pluginu
 * vypíše meta description a JSON-LD sám.
 */

defined( 'ABSPATH' ) || exit;

define( 'PVSP_VERSION', '{{VERSION}}' );
define( 'PVSP_PRICES_UPDATED', '{{UPDATED}}' );
define( 'PVSP_SHORTCODE', 'srovnani_platforem' );

/**
 * Registrace assetů a shortcodu.
 */
function pvsp_init() {
	wp_register_style(
		'pvsp-kalkulacka',
		plugins_url( 'assets/kalkulacka.css', __FILE__ ),
		array(),
		PVSP_VERSION
	);
	wp_register_script(
		'pvsp-kalkulacka',
		plugins_url( 'assets/kalkulacka.js', __FILE__ ),
		array(),
		PVSP_VERSION,
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
	add_shortcode( PVSP_SHORTCODE, 'pvsp_render_shortcode' );
}
add_action( 'init', 'pvsp_init' );

/**
 * Styl načteme v hlavičce jen na stránkách, které shortcode obsahují.
 */
function pvsp_enqueue_assets() {
	if ( ! is_singular() ) {
		return;
	}
	$post = get_post();
	if ( $post instanceof WP_Post && has_shortcode( $post->post_content, PVSP_SHORTCODE ) ) {
		wp_enqueue_style( 'pvsp-kalkulacka' );
	}
}
add_action( 'wp_enqueue_scripts', 'pvsp_enqueue_assets' );

/**
 * Výstup shortcodu. Atributy se ignorují.
 *
 * @return string
 */
function pvsp_render_shortcode() {
	static $rendered = false;

	// Kalkulačka používá pevná ID, proto ji na stránce vykreslíme jen jednou.
	if ( $rendered ) {
		return '';
	}

	$file = plugin_dir_path( __FILE__ ) . 'templates/content.html';
	if ( ! is_readable( $file ) ) {
		return '';
	}

	$rendered = true;
	wp_enqueue_style( 'pvsp-kalkulacka' );
	wp_enqueue_script( 'pvsp-kalkulacka' );

	// Šablona je statický soubor dodaný s pluginem (ne vstup uživatele),
	// obsahuje formulářové prvky, které by wp_kses_post odstranil.
	$html = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

	return false === $html ? '' : $html;
}


/* -------------------------------------------------------------------------
 * SEO: strukturovaná data a meta description
 * ---------------------------------------------------------------------- */

/**
 * Je aktuální stránka ta s kalkulačkou?
 * Page buildery, které shortcode neukládají do post_content, mohou výsledek
 * přepsat filtrem: add_filter( 'pvsp_is_calc_page', '__return_true' );
 *
 * @return bool
 */
function pvsp_is_calc_page() {
	static $result = null;
	if ( null !== $result ) {
		return $result;
	}
	$result = false;
	if ( is_singular() ) {
		$post   = get_queried_object();
		$result = ( $post instanceof WP_Post ) && has_shortcode( $post->post_content, PVSP_SHORTCODE );
	}
	$result = (bool) apply_filters( 'pvsp_is_calc_page', $result );
	return $result;
}

/**
 * Který SEO plugin je aktivní: 'yoast', 'rankmath', 'other' nebo ''.
 *
 * @return string
 */
function pvsp_seo_plugin() {
	if ( defined( 'WPSEO_VERSION' ) ) {
		return 'yoast';
	}
	if ( defined( 'RANK_MATH_VERSION' ) || class_exists( 'RankMath' ) ) {
		return 'rankmath';
	}
	if ( defined( 'SEOPRESS_VERSION' ) || defined( 'AIOSEO_VERSION' ) || defined( 'THE_SEO_FRAMEWORK_VERSION' ) ) {
		return 'other';
	}
	return '';
}

/**
 * Výchozí popis stránky (použije se jen tam, kde žádný není nastavený).
 *
 * @return string
 */
function pvsp_default_description() {
	return 'Kalkulačka nákladů a funkční srovnání e-shopových platforem pro CZ, SK a EU: Shopify, Shoptet, Upgates, Shopware, Magento, PrestaShop, Eshop-rychle, SimpleShop, Webnode a Wix.';
}

/**
 * Datum poslední změny: novější z data ověření cen a data úpravy stránky.
 *
 * @return string ISO 8601
 */
function pvsp_date_modified() {
	$prices = strtotime( PVSP_PRICES_UPDATED . 'T00:00:00Z' );
	$page   = (int) get_post_modified_time( 'U', true, get_queried_object() );
	return gmdate( 'c', max( $prices, $page ) );
}

/**
 * Doplní údaje do uzlu WebPage.
 *
 * @param array $node Uzel WebPage.
 * @return array
 */
function pvsp_enrich_webpage( $node ) {
	if ( ! is_array( $node ) ) {
		return $node;
	}
	$node['dateModified'] = pvsp_date_modified();
	$node['author']       = array(
		'@type' => 'Person',
		'name'  => 'Pavel Vranka',
		'url'   => 'https://pavelvranka.cz',
	);
	$node['about']        = array(
		'@type' => 'Thing',
		'name'  => 'Srovnání e-shopových platforem',
	);
	if ( empty( $node['inLanguage'] ) ) {
		$node['inLanguage'] = 'cs';
	}
	return $node;
}

/**
 * Napojení podle skutečně aktivního SEO pluginu. Spouští se až po načtení
 * všech pluginů, takže detekce nezávisí na pořadí aktivace.
 */
function pvsp_seo_setup() {
	switch ( pvsp_seo_plugin() ) {
		case 'yoast':
			add_filter(
				'wpseo_schema_webpage',
				function ( $data ) {
					return pvsp_is_calc_page() ? pvsp_enrich_webpage( $data ) : $data;
				}
			);
			add_filter(
				'wpseo_metadesc',
				function ( $desc ) {
					return ( pvsp_is_calc_page() && '' === trim( (string) $desc ) ) ? pvsp_default_description() : $desc;
				}
			);
			break;

		case 'rankmath':
			add_filter(
				'rank_math/json_ld',
				function ( $data ) {
					if ( ! pvsp_is_calc_page() || ! is_array( $data ) ) {
						return $data;
					}
					foreach ( $data as $key => $node ) {
						$type = isset( $node['@type'] ) ? (array) $node['@type'] : array();
						if ( in_array( 'WebPage', $type, true ) ) {
							$data[ $key ] = pvsp_enrich_webpage( $node );
						}
					}
					return $data;
				},
				99
			);
			add_filter(
				'rank_math/frontend/description',
				function ( $desc ) {
					return ( pvsp_is_calc_page() && '' === trim( (string) $desc ) ) ? pvsp_default_description() : $desc;
				}
			);
			break;

		case 'other':
			// Jiný SEO plugin: nic nevypisujeme, aby nevznikly duplicity.
			break;

		default:
			add_action( 'wp_head', 'pvsp_fallback_head', 5 );
	}
}
add_action( 'plugins_loaded', 'pvsp_seo_setup', 20 );

/**
 * Bez SEO pluginu: meta description a JSON-LD vypíše plugin sám.
 */
function pvsp_fallback_head() {
	if ( ! pvsp_is_calc_page() ) {
		return;
	}
	$post  = get_queried_object();
	$graph = pvsp_enrich_webpage(
		array(
			'@context'      => 'https://schema.org',
			'@type'         => 'WebPage',
			'name'          => wp_strip_all_tags( get_the_title( $post ) ),
			'url'           => get_permalink( $post ),
			'description'   => pvsp_default_description(),
			'datePublished' => get_post_time( 'c', true, $post ),
		)
	);
	echo '<meta name="description" content="' . esc_attr( pvsp_default_description() ) . '">' . "\n";
	echo '<script type="application/ld+json">' . wp_json_encode( $graph, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP ) . "</script>\n";
}
