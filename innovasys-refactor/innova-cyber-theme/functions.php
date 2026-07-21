<?php
/**
 * Innova Cyber Theme — Functions & Setup
 *
 * @package InnovaCyber
 * @since   1.0.0
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Theme Constants
// ---------------------------------------------------------------------------
define( 'INNOVA_CYBER_VERSION', '1.0.0' );
define( 'INNOVA_CYBER_DIR', get_template_directory() );
define( 'INNOVA_CYBER_URI', get_template_directory_uri() );

// ---------------------------------------------------------------------------
// 1. SECURITY HOTFIXES
// ---------------------------------------------------------------------------

/**
 * Disable REST API user endpoint (prevents username enumeration).
 */
add_filter( 'rest_endpoints', 'innova_disable_rest_user_endpoints' );
function innova_disable_rest_user_endpoints( array $endpoints ): array {
	if ( isset( $endpoints['/wp/v2/users'] ) ) {
		unset( $endpoints['/wp/v2/users'] );
	}
	if ( isset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] ) ) {
		unset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
	}
	return $endpoints;
}

/**
 * Disable XML-RPC completely.
 */
add_filter( 'xmlrpc_enabled', '__return_false' );

/**
 * Remove WordPress version from generator tag.
 */
remove_action( 'wp_head', 'wp_generator' );

/**
 * Disable file editor in admin (also set in wp-config.php for defense in depth).
 */
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
	define( 'DISALLOW_FILE_EDIT', true );
}

// ---------------------------------------------------------------------------
// 2. THEME SETUP
// ---------------------------------------------------------------------------

add_action( 'after_setup_theme', 'innova_theme_setup' );
function innova_theme_setup(): void {
	// Block editor styles
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'custom-line-height' );
	add_theme_support( 'custom-spacing' );
	add_theme_support( 'custom-units' );

	// Custom logo
	add_theme_support( 'custom-logo', [
		'height'      => 80,
		'width'       => 240,
		'flex-width'  => true,
		'flex-height' => true,
	] );

	// Title tag
	add_theme_support( 'title-tag' );

	// Post thumbnails
	add_theme_support( 'post-thumbnails' );

	// HTML5 support
	add_theme_support( 'html5', [
		'search-form',
		'comment-form',
		'comment-list',
		'gallery',
		'caption',
		'style',
		'script',
	] );

	// Editor styles
	add_editor_style( 'assets/css/editor.css' );

	// Register navigation menus
	register_nav_menus( [
		'primary' => esc_html__( 'Primary Navigation', 'innova-cyber' ),
		'footer'  => esc_html__( 'Footer Navigation', 'innova-cyber' ),
	] );
}

// ---------------------------------------------------------------------------
// 3. FIX EMPTY HOME TITLE (Yoast fallback)
// ---------------------------------------------------------------------------

add_filter( 'document_title_parts', 'innova_fix_home_title' );
function innova_fix_home_title( array $title ): array {
	if ( is_front_page() && ( empty( $title['title'] ) || trim( $title['title'] ) === '-' ) ) {
		$title['title'] = 'Innova Systems | Ciberseguridad Empresarial Costa Rica';
	}
	return $title;
}

// ---------------------------------------------------------------------------
// 4. ENQUEUE SCRIPTS & STYLES
// ---------------------------------------------------------------------------

add_action( 'wp_enqueue_scripts', 'innova_enqueue_assets' );
function innova_enqueue_assets(): void {
	// Theme styles
	wp_enqueue_style(
		'innova-cyber-theme',
		INNOVA_CYBER_URI . '/assets/css/additional.css',
		[],
		INNOVA_CYBER_VERSION
	);

	// Animated counters (homepage metrics band)
	wp_enqueue_script(
		'innova-counters',
		INNOVA_CYBER_URI . '/assets/js/counters.js',
		[],
		INNOVA_CYBER_VERSION,
		[ 'strategy' => 'defer' ]
	);

	// Navigation script (mobile menu)
	wp_enqueue_script(
		'innova-navigation',
		INNOVA_CYBER_URI . '/assets/js/navigation.js',
		[],
		INNOVA_CYBER_VERSION,
		[ 'strategy' => 'defer' ]
	);
}

// ---------------------------------------------------------------------------
// 5. GOOGLE FONTS (Inter) — Preconnect + Enqueue
// ---------------------------------------------------------------------------

add_action( 'wp_enqueue_scripts', 'innova_enqueue_fonts', 5 );
function innova_enqueue_fonts(): void {
	wp_enqueue_style(
		'innova-fonts',
		'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
		[],
		null
	);
}

add_action( 'wp_head', 'innova_font_preconnect', 1 );
function innova_font_preconnect(): void {
	?>
	<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<?php
}

// ---------------------------------------------------------------------------
// 6. RESOURCE HINTS
// ---------------------------------------------------------------------------

add_action( 'wp_head', 'innova_resource_hints', 2 );
function innova_resource_hints(): void {
	?>
	<link rel="dns-prefetch" href="//www.googletagmanager.com" />
	<link rel="dns-prefetch" href="//www.google-analytics.com" />
	<?php
}

// ---------------------------------------------------------------------------
// 7. BLOCK PATTERNS REGISTRATION
// ---------------------------------------------------------------------------

add_action( 'init', 'innova_register_block_patterns' );
function innova_register_block_patterns(): void {
	$pattern_files = glob( INNOVA_CYBER_DIR . '/patterns/*.php' );
	if ( ! $pattern_files ) {
		return;
	}

	foreach ( $pattern_files as $file ) {
		$pattern_data = get_file_data( $file, [
			'title'       => 'Pattern Title',
			'slug'        => 'Pattern Slug',
			'description' => 'Description',
			'categories'  => 'Categories',
			'keywords'    => 'Keywords',
			'viewport'    => 'Viewport Width',
		] );

		if ( empty( $pattern_data['slug'] ) ) {
			continue;
		}

		$block_types = [];
		if ( ! empty( $pattern_data['viewport'] ) ) {
			$block_types = [ 'core/post-content' => [ 'viewport' => (int) $pattern_data['viewport'] ] ];
		}

		register_block_pattern(
			'innova/' . sanitize_title( $pattern_data['slug'] ),
			[
				'title'         => sanitize_text_field( $pattern_data['title'] ),
				'description'   => sanitize_text_field( $pattern_data['description'] ),
				'categories'    => array_map( 'trim', explode( ',', $pattern_data['categories'] ) ),
				'keywords'      => array_map( 'trim', explode( ',', $pattern_data['keywords'] ) ),
				'content'       => file_get_contents( $file ),
				'blockTypes'    => $block_types,
			]
		);
	}
}

/**
 * Register block pattern categories.
 */
add_action( 'init', 'innova_register_pattern_categories' );
function innova_register_pattern_categories(): void {
	$categories = [
		'innova-hero'     => [ 'label' => __( 'Innova Heroes', 'innova-cyber' ) ],
		'innova-services' => [ 'label' => __( 'Innova Services', 'innova-cyber' ) ],
		'innova-trust'    => [ 'label' => __( 'Innova Trust Signals', 'innova-cyber' ) ],
		'innova-cta'      => [ 'label' => __( 'Innova CTAs', 'innova-cyber' ) ],
		'innova-content'  => [ 'label' => __( 'Innova Content', 'innova-cyber' ) ],
	];

	foreach ( $categories as $slug => $args ) {
		register_block_pattern_category( $slug, $args );
	}
}

// ---------------------------------------------------------------------------
// 8. ACF CUSTOM BLOCKS REGISTRATION
// ---------------------------------------------------------------------------

add_action( 'init', 'innova_register_acf_blocks' );
function innova_register_acf_blocks(): void {
	if ( ! function_exists( 'acf_register_block_type' ) ) {
		return;
	}

	$blocks = [
		'service-card' => [
			'name'            => 'service-card',
			'title'           => __( 'Service Card', 'innova-cyber' ),
			'description'     => __( 'A service offering card with icon, title, description, and CTA.', 'innova-cyber' ),
			'icon'            => 'grid-view',
			'post_types'      => [ 'page' ],
		],
		'metrics-counter' => [
			'name'            => 'metrics-counter',
			'title'           => __( 'Metrics Counter', 'innova-cyber' ),
			'description'     => __( 'Animated stat counter (e.g., "99.9% uptime").', 'innova-cyber' ),
			'icon'            => 'chart-bar',
			'post_types'      => [ 'page' ],
		],
		'case-study' => [
			'name'            => 'case-study',
			'title'           => __( 'Case Study Card', 'innova-cyber' ),
			'description'     => __( 'Case study highlight with metrics and download CTA.', 'innova-cyber' ),
			'icon'            => 'portfolio',
			'post_types'      => [ 'page', 'post' ],
		],
		'certification-badge' => [
			'name'            => 'certification-badge',
			'title'           => __( 'Certification Badge', 'innova-cyber' ),
			'description'     => __( 'Certification or partner logo with label.', 'innova-cyber' ),
			'icon'            => 'awards',
			'post_types'      => [ 'page' ],
		],
		'team-member' => [
			'name'            => 'team-member',
			'title'           => __( 'Team Member', 'innova-cyber' ),
			'description'     => __( 'Team member card with photo, name, role, bio.', 'innova-cyber' ),
			'icon'            => 'groups',
			'post_types'      => [ 'page' ],
		],
		'trust-bar' => [
			'name'            => 'trust-bar',
			'title'           => __( 'Trust Bar', 'innova-cyber' ),
			'description'     => __( 'Client logos or certification badges row.', 'innova-cyber' ),
			'icon'            => 'shield',
			'post_types'      => [ 'page' ],
		],
		'architecture-diagram' => [
			'name'            => 'architecture-diagram',
			'title'           => __( 'Architecture Diagram', 'innova-cyber' ),
			'description'     => __( 'Uploadable architecture/network diagram with caption.', 'innova-cyber' ),
			'icon'            => 'analytics',
			'post_types'      => [ 'page' ],
		],
	];

	$render_base = INNOVA_CYBER_DIR . '/blocks/';

	foreach ( $blocks as $block ) {
		acf_register_block_type( wp_parse_args( $block, [
			'render_template' => $render_base . $block['name'] . '.php',
			'category'        => 'innova-blocks',
			'mode'            => 'edit',
			'supports'        => [
				'align'      => [ 'wide', 'full' ],
				'anchor'     => true,
				'color'      => [
					'background' => true,
					'text'       => true,
				],
				'spacing'    => [
					'margin'  => true,
					'padding' => true,
				],
			],
		] ) );
	}
}

// ---------------------------------------------------------------------------
// 9. GUTENBERG BLOCK STYLES
// ---------------------------------------------------------------------------

add_action( 'enqueue_block_editor_assets', 'innova_editor_styles' );
function innova_editor_styles(): void {
	wp_enqueue_style(
		'innova-editor',
		INNOVA_CYBER_URI . '/assets/css/editor.css',
		[],
		INNOVA_CYBER_VERSION
	);
}

// ---------------------------------------------------------------------------
// 10. BODY CLASSES
// ---------------------------------------------------------------------------

add_filter( 'body_class', 'innova_body_classes' );
function innova_body_classes( array $classes ): array {
	if ( is_front_page() ) {
		$classes[] = 'innova-front-page';
	}
	$classes[] = 'innova-theme';
	return $classes;
}

// ---------------------------------------------------------------------------
// 11. GOTORINSYS.COM REDIRECT (enable when secondary domain is DNS-set)
// ---------------------------------------------------------------------------
/*
add_action( 'template_redirect', 'innova_gotorinsys_redirect' );
function innova_gotorinsys_redirect(): void {
	if ( isset( $_SERVER['HTTP_HOST'] ) && in_array( $_SERVER['HTTP_HOST'], [ 'gotorinsys.com', 'www.gotorinsys.com' ], true ) ) {
		wp_safe_redirect( 'https://innovasys.co.cr' . esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ), 301 );
		exit;
	}
}
*/

// ---------------------------------------------------------------------------
// 12. WP_CUSTOM — Disable admin bar on front for all non-admin
// ---------------------------------------------------------------------------
add_action( 'after_setup_theme', 'innova_disable_admin_bar' );
function innova_disable_admin_bar(): void {
	if ( ! current_user_can( 'administrator' ) ) {
		show_admin_bar( false );
	}
}

// ---------------------------------------------------------------------------
// 13. YOAST HOMEPAGE TITLE & META OVERRIDE
// ---------------------------------------------------------------------------
add_filter( 'wpseo_title', 'innova_yoast_home_title', 999 );
function innova_yoast_home_title( $title ) {
    if ( is_front_page() ) {
        return 'Innova Systems | Ciberseguridad Empresarial Costa Rica';
    }
    return $title;
}

add_filter( 'wpseo_opengraph_title', 'innova_yoast_og_title', 999 );
function innova_yoast_og_title( $title ) {
    if ( is_front_page() ) {
        return 'Innova Systems | Ciberseguridad Empresarial Costa Rica';
    }
    return $title;
}

add_filter( 'wpseo_opengraph_desc', 'innova_yoast_og_desc', 999 );
function innova_yoast_og_desc( $desc ) {
    if ( is_front_page() ) {
        return 'Centro de Operaciones de Seguridad (SOC) en Costa Rica. Protegemos su empresa con análisis de vulnerabilidades, concienciación y gestión de infraestructura TI.';
    }
    return $desc;
}

add_filter( 'wpseo_schema_webpage', 'innova_yoast_schema_name', 999 );
function innova_yoast_schema_name( $data ) {
    if ( is_front_page() && isset( $data['name'] ) ) {
        $data['name'] = 'Innova Systems | Ciberseguridad Empresarial Costa Rica';
    }
    return $data;
}

// ---------------------------------------------------------------------------
// 14. SECURITY HEADERS (via PHP to bypass nginx cache stripping)
// ---------------------------------------------------------------------------
add_action( 'send_headers', 'innova_send_security_headers' );
function innova_send_security_headers(): void {
	if ( headers_sent() ) {
		return;
	}

	// HSTS — enable preload once confirmed at hstspreload.org
	header( 'Strict-Transport-Security: max-age=31536000; includeSubDomains' );

	// Content Security Policy (enforced)
	header( "Content-Security-Policy: default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self' https:; frame-ancestors 'none'; upgrade-insecure-requests" );

	// Other security headers
	header( 'X-Content-Type-Options: nosniff' );
	header( 'X-Frame-Options: DENY' );
	header( 'Referrer-Policy: strict-origin-when-cross-origin' );
	header( 'X-XSS-Protection: 0' ); // Deprecated but harmless
}
