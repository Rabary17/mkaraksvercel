<?php
/**
 * Plugin Name: Mkaraks Headless
 * Description: Expose les données karaoké à la REST API pour le front Next.js (champ "mkaraks"), l'authentification serveur à serveur et la revalidation du cache Vercel.
 * Version:     1.0.0
 *
 * wp-config.php :
 *   define( 'MKARAKS_HEADLESS_SECRET', '...' );            // = WP_HEADLESS_SECRET côté Vercel
 *   define( 'MKARAKS_FRONT_URL', 'https://mkaraks.com' );  // front Next.js
 *   define( 'MKARAKS_REVALIDATE_SECRET', '...' );          // = REVALIDATE_SECRET côté Vercel
 */

defined( 'ABSPATH' ) || exit;

/** Noms des méta JetEngine du CPT karaoke. À vérifier dans JetEngine → Meta Boxes. */
const MKARAKS_META = array(
	'audio'  => 'instrument_url',
	'lyrics' => 'lyrics_url',
	'chord'  => 'chord_url',
	'key'    => 'tonalite',
	'bpm'    => 'bpm',
	'genre'  => 'genre',
);

/* -------------------------------------------------------------------------- */
/* 1. Champ REST "mkaraks" sur le CPT karaoke                                  */
/* -------------------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
	register_rest_field( 'karaoke', 'mkaraks', array(
		'get_callback' => function ( $post ) {
			$id    = (int) $post['id'];
			$terms = get_the_terms( $id, 'artist' );
			$term  = ( $terms && ! is_wp_error( $terms ) ) ? $terms[0] : null;
			$out   = array(
				'artist' => $term ? array( 'id' => $term->term_id, 'name' => html_entity_decode( $term->name ), 'slug' => $term->slug ) : null,
			);
			foreach ( MKARAKS_META as $field => $meta_key ) {
				$v             = get_post_meta( $id, $meta_key, true );
				$out[ $field ] = ( '' === $v || null === $v ) ? null : (string) $v;
			}
			return $out;
		},
		'schema' => array( 'type' => 'object', 'context' => array( 'view' ) ),
	) );

	/* ---------------------------------------------------------------------- */
	/* 2. Authentification appelée UNIQUEMENT par le serveur Next.js           */
	/* ---------------------------------------------------------------------- */
	register_rest_route( 'mkaraks/v1', '/auth', array(
		'methods'             => 'POST',
		'permission_callback' => function ( WP_REST_Request $req ) {
			$secret = defined( 'MKARAKS_HEADLESS_SECRET' ) ? MKARAKS_HEADLESS_SECRET : '';
			return $secret && hash_equals( $secret, (string) $req->get_header( 'x-mkaraks-secret' ) );
		},
		'callback'            => function ( WP_REST_Request $req ) {
			$login = sanitize_text_field( (string) $req->get_param( 'username' ) );
			$pass  = (string) $req->get_param( 'password' );

			// Anti-bruteforce simple : 10 essais / 15 min par identifiant.
			$rl_key = 'mk_auth_' . md5( strtolower( $login ) );
			$tries  = (int) get_transient( $rl_key );
			if ( $tries >= 10 ) {
				return new WP_Error( 'too_many', 'Trop de tentatives.', array( 'status' => 429 ) );
			}

			if ( is_email( $login ) ) {
				$u = get_user_by( 'email', $login );
				if ( $u ) {
					$login = $u->user_login;
				}
			}
			$user = wp_authenticate( $login, $pass );
			if ( is_wp_error( $user ) ) {
				set_transient( $rl_key, $tries + 1, 15 * MINUTE_IN_SECONDS );
				return new WP_Error( 'invalid', 'Identifiants invalides.', array( 'status' => 401 ) );
			}
			delete_transient( $rl_key );
			return array( 'id' => $user->ID, 'name' => $user->display_name );
		},
	) );
} );

/* -------------------------------------------------------------------------- */
/* 2 bis. Inscription (écran « Crée ton compte »), serveur à serveur           */
/* -------------------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'mkaraks/v1', '/register', array(
		'methods'             => 'POST',
		'permission_callback' => function ( WP_REST_Request $req ) {
			$secret = defined( 'MKARAKS_HEADLESS_SECRET' ) ? MKARAKS_HEADLESS_SECRET : '';
			return $secret && hash_equals( $secret, (string) $req->get_header( 'x-mkaraks-secret' ) );
		},
		'callback'            => function ( WP_REST_Request $req ) {
			$name  = sanitize_text_field( (string) $req->get_param( 'name' ) );
			$email = sanitize_email( (string) $req->get_param( 'email' ) );
			$pass  = (string) $req->get_param( 'password' );

			if ( ! $name || ! is_email( $email ) || strlen( $pass ) < 8 ) {
				return new WP_Error( 'invalid', 'Informations invalides.', array( 'status' => 400 ) );
			}
			if ( email_exists( $email ) ) {
				return new WP_Error( 'exists', 'Un compte existe déjà avec cet e-mail.', array( 'status' => 409 ) );
			}

			// Identifiant technique unique dérivé du pseudo.
			$base  = sanitize_user( remove_accents( strtolower( $name ) ), true ) ?: 'chanteur';
			$login = $base;
			for ( $i = 2; username_exists( $login ); $i++ ) {
				$login = $base . $i;
			}

			$id = wp_insert_user( array(
				'user_login'   => $login,
				'user_email'   => $email,
				'user_pass'    => $pass,
				'display_name' => $name,
				'nickname'     => $name,
				'role'         => 'subscriber',
			) );
			if ( is_wp_error( $id ) ) {
				return new WP_Error( 'failed', 'Inscription impossible.', array( 'status' => 400 ) );
			}
			return array( 'id' => $id, 'name' => $name );
		},
	) );
} );

/* -------------------------------------------------------------------------- */
/* 3. Revalidation du cache Next.js à chaque modification                      */
/* -------------------------------------------------------------------------- */
function mkaraks_revalidate( array $tags ) {
	if ( ! defined( 'MKARAKS_FRONT_URL' ) || ! defined( 'MKARAKS_REVALIDATE_SECRET' ) ) {
		return;
	}
	wp_remote_post( rtrim( MKARAKS_FRONT_URL, '/' ) . '/api/revalidate', array(
		'blocking' => false,
		'timeout'  => 3,
		'headers'  => array( 'Content-Type' => 'application/json', 'X-Revalidate-Secret' => MKARAKS_REVALIDATE_SECRET ),
		'body'     => wp_json_encode( array( 'tags' => $tags ) ),
	) );
}

add_action( 'save_post_karaoke', function ( $post_id, $post ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	$tags  = array( 'songs', 'song:' . $post->post_name );
	$terms = get_the_terms( $post_id, 'artist' );
	if ( $terms && ! is_wp_error( $terms ) ) {
		foreach ( $terms as $t ) {
			$tags[] = 'artist:' . $t->slug;
		}
	}
	mkaraks_revalidate( $tags );
}, 10, 2 );

add_action( 'edited_artist', function ( $term_id ) {
	$t = get_term( $term_id, 'artist' );
	mkaraks_revalidate( array( 'artists', 'artist:' . ( $t ? $t->slug : '' ) ) );
} );
add_action( 'created_artist', fn() => mkaraks_revalidate( array( 'artists' ) ) );
add_action( 'deleted_post', fn() => mkaraks_revalidate( array( 'songs' ) ) );

/* -------------------------------------------------------------------------- */
/* 4. Mise à l'écart des moteurs de recherche                                  */
/* -------------------------------------------------------------------------- */
/**
 * Un WordPress devenu backend ne doit plus être indexé : son contenu est servi
 * par le front, et le laisser visible crée un duplicata de chaque page.
 *
 * ACTIVATION EXPLICITE, dans wp-config.php :
 *   define( 'MKARAKS_NOINDEX', true );
 *
 * Jamais actif par défaut : installé par mégarde sur le site public, ce plugin
 * effacerait son référencement sans que personne ne s'en aperçoive avant des
 * semaines.
 *
 * NE PAS compléter par « Disallow: / » dans robots.txt. Un Disallow interdit le
 * CRAWL, pas l'INDEXATION : Google cesse de relire la page, ne voit donc jamais
 * le noindex ci-dessous, et les URLs déjà connues restent dans l'index, privées
 * de titre et de description. L'ordre correct est de laisser crawler jusqu'à
 * disparition des pages, et seulement ensuite d'économiser le crawl.
 */
if ( defined( 'MKARAKS_NOINDEX' ) && MKARAKS_NOINDEX ) {

	// En-tête HTTP : la seule directive que Google suit sur une réponse non HTML.
	add_action( 'send_headers', function () {
		if ( ! headers_sent() ) {
			header( 'X-Robots-Tag: noindex, nofollow, noarchive', true );
		}
	} );

	// Et la balise, pour les robots qui ne lisent que le HTML.
	add_action( 'wp_head', function () {
		echo '<meta name="robots" content="noindex, nofollow" />' . "\n";
	}, 1 );

	// Un sitemap qui annonce des pages non indexables envoie un signal contradictoire.
	add_filter( 'wp_sitemaps_enabled', '__return_false' );
}
