<?php
/**
 * Plugin Name:       AiWriter
 * Description:       When the AI completes your sentence... Register at https://aiwriter.space to use this plugin! Thanks.
 * Requires at least: 6.1.0
 * Requires PHP:      8.0.0
 * Version:           0.2.0
 * Author:            floriansimeth
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       aiwriter
 * Update URI:        https://api.github.com/repos/code-flow/aiwriter/releases/latest
 *
 * @package           ai_writer
 */

namespace wpbuddy\ai_writer;

use Exception;
use WP_Error;
use WP_HTTP_Response;
use WP_REST_Request;
use WP_REST_Response;

define( 'AIWRITER_API_URL', 'https://aiwriter.space/api/' );

add_action( 'init', 'wpbuddy\ai_writer\registerSettings' );

/**
 * @return void
 * @since 0.1.0
 */
function registerSettings(): void {
	register_setting(
		'options',
		'aiwriter/activation_code',
		[
			'type'              => 'string',
			'sanitize_callback' => '\wpbuddy\ai_writer\cryptoHelper',
			'show_in_rest'      => true,
			'default'           => ''
		]
	);
}

add_action( 'rest_api_init', 'wpbuddy\ai_writer\setupRestRoutes' );

/**
 * @param WP_REST_Request $request
 *
 * @return WP_REST_Response|WP_Error|WP_HTTP_Response
 * @since 0.1.0
 */
function restComplete( WP_REST_Request $request ): WP_REST_Response|WP_Error|WP_HTTP_Response {

	$apiUrl = AIWRITER_API_URL;

	if ( defined( 'WP_DEBUG' ) && WP_DEBUG && defined( 'AIWRITER_DEV_API_URL' ) ) {
		$apiUrl = trailingslashit( AIWRITER_DEV_API_URL );
	}

	try {
		$activationCode = cryptoHelper( get_option( 'aiwriter/activation_code', '' ), 'decrypt' );
	} catch ( Exception $e ) {
		return new WP_Error(
			'ai-writer-gpt-rest-crypto-error',
			sprintf( __( 'Could not decrypt your activation code. Got error: %s', 'aiwriter' ), $e->getMessage() ),
		);
	}

	$response = wp_remote_post(
		$apiUrl,
		[
			'headers'     => [
				'Authorization' => 'Bearer ' . $activationCode,
				'Content-Type'  => 'application/json; charset=utf-8'
			],
			'body'        => json_encode( [
				"model"       => "text-davinci-003",
				"prompt"      => $request->get_param( 'prompt' ),
				"temperature" => (float) $request->get_param( 'temperature' ),
				"max_tokens"  => (int) $request->get_param( 'max_tokens' ),
				"stream"      => false
			] ),
			'data_format' => 'body',
			'timeout'     => function_exists( 'ini_get' ) ? ini_get( 'max_execution_time' ) : 30,
		]
	);

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	/**
	 * @var WP_HTTP_Response $response
	 */
	$response = $response['http_response'];

	try {
		$body = json_decode( $response->get_data(), null, 512, JSON_THROW_ON_ERROR );
	} catch ( \Exception $e ) {
		return new WP_Error(
			'ai-writer-gpt-response-json',
			$e->getMessage(),
		);
	}

	if ( $response->get_status() < 200 || $response->get_status() >= 300 ) {

		if ( isset( $body->data ) && isset( $body->data->message ) ) {
			return new WP_Error(
				'ai-writer-gpt-response-status-code',
				sprintf(
					__( 'Could not fetch data from API (wrong status code) with error: %s (%d)', 'aiwriter' ),
					$body->data->message,
					$body->data->code,
				),
				$response
			);
		}

		return new WP_Error(
			'ai-writer-gpt-response-status-code',
			__( 'Could not fetch data from API (wrong status code).', 'aiwriter' ),
			$response
		);
	}

	return rest_ensure_response( [
		'text' => nl2br( sanitize_textarea_field( $body->text ) )
	] );
}

/**
 * @return void
 * @since 0.1.0
 */
function setupRestRoutes(): void {
	register_rest_route( 'wpbuddy/ai-writer/v1', 'completions', [
		'methods'             => \WP_REST_Server::CREATABLE,
		'callback'            => 'wpbuddy\ai_writer\restComplete',
		'permission_callback' => static function () {

			return current_user_can( 'edit_posts' );
		},
		'args'                => [
			'prompt'      => [
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => function ( $param ) {

					return sanitize_text_field( $param );
				},
			],
			'temperature' => [
				'type'             => 'number',
				'exclusiveMinimum' => 0,
				'exclusiveMaximum' => 1,
			],
			'max_tokens'  => [
				'type'             => 'integer',
				'exclusiveMinimum' => 1,
				'exclusiveMaximum' => 4096,
			]
		],
	] );
}


add_action( 'admin_init', 'wpbuddy\ai_writer\registerScripts' );

/**
 * @return void
 * @since 0.1.0
 */
function registerScripts(): void {
	$asset = include __DIR__ . '/build/index.asset.php';

	wp_register_script(
		'ai-writer-block-editor',
		plugins_url( '/build/index.js', __FILE__ ),
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_register_style(
		'ai-writer-block-editor',
		plugins_url( '/build/index.css', __FILE__ ),
		[],
		$asset['version']
	);
}

add_action( 'admin_enqueue_scripts', 'wpbuddy\ai_writer\enqueueBlockEditorScripts' );

/**
 * @return void
 * @since 0.1.0
 */
function enqueueBlockEditorScripts(): void {
	if ( ! function_exists( 'get_current_screen' ) ) {
		return;
	}

	$screen = get_current_screen();

	if ( ! $screen instanceof \WP_Screen ) {
		return;
	}

	if ( ! isset( $screen->is_block_editor ) ) {
		return;
	}

	if ( ! $screen->is_block_editor ) {
		return;
	}

	wp_enqueue_script( 'ai-writer-block-editor' );

	if ( ! function_exists( 'get_plugin_data' ) ) {
		$file = ABSPATH . 'wp-admin/includes/plugin.php';

		if ( is_file( $file ) ) {
			require $file;
		} else {
			return;
		}
	}

	$pluginData = get_plugin_data( __FILE__, false, false );
	$apiUrl     = AIWRITER_API_URL;

	if ( defined( 'WP_DEBUG' ) && WP_DEBUG && defined( 'AIWRITER_DEV_API_URL' ) ) {
		$apiUrl = trailingslashit( AIWRITER_DEV_API_URL );
	}

	$data = (object) [
		'isOn'        => true,
		'version'     => $pluginData['Version'],
		'apiUrl'      => $apiUrl,
		'temperature' => 0.8,
		'maxTokens'   => 16,
	];

	wp_add_inline_script(
		'ai-writer-block-editor',
		sprintf(
			'window.AiWriter = %s',
			json_encode( $data )
		),
		'before'
	);

	wp_enqueue_style( 'ai-writer-block-editor' );
}

/**
 * @param string $data
 * @param string $direction
 *
 * @return string
 * @throws Exception
 */
function cryptoHelper( string $data, string $direction = 'encrypt' ): string {

	$iv = substr( NONCE_SALT, 0, 16 );
	if ( strlen( $iv ) !== 16 ) {
		// fallback
		$iv = 'S6mYDpWa+a4zxM1p';
	}

	if ( 'encrypt' === $direction ) {
		if ( function_exists( 'openssl_encrypt' ) ) {
			$encryptedData = openssl_encrypt(
				$data,
				'aes-256-cbc',
				AUTH_SALT,
				OPENSSL_RAW_DATA,
				$iv
			);
		}

		if ( isset( $encryptedData ) ) {
			if ( false === $encryptedData ) {
				return base64_encode( $data );
			}

			return base64_encode( $encryptedData );
		}

		return base64_encode( $data );
	} else {
		$data = base64_decode( $data );
		if ( function_exists( 'openssl_encrypt' ) ) {
			$decryptedData = openssl_decrypt(
				$data,
				'aes-256-cbc',
				AUTH_SALT,
				OPENSSL_RAW_DATA,
				$iv
			);
		}

		if ( isset( $decryptedData ) ) {
			if ( false === $decryptedData ) {
				throw new Exception(
					__( 'Cannot decrypt.', 'aiwriter' ),
					1
				);
			}

			return $decryptedData;
		}

		return $data;
	}
}

add_filter( 'update_plugins_api.github.com', 'wpbuddy\ai_writer\checkPluginUpdate', 10, 2 );

/**
 * @param array|bool $toUpdate
 * @param array $pluginData
 *
 * @return array|bool
 * @since 0.2.0
 */
function checkPluginUpdate( $toUpdate, $pluginData ) {
	static $latestVersion = null;

	if ( $toUpdate ) {
		return $toUpdate;
	}

	if ( false === stripos( $pluginData['UpdateURI'], 'code-flow/aiwriter' ) ) {
		return $toUpdate;
	}

	if ( ! $latestVersion ) {

		$response = wp_remote_get( $pluginData['UpdateURI'] );

		if ( is_wp_error( $response ) ) {
			return false;
		}

		$body = wp_remote_retrieve_body( $response );

		try {
			$json = json_decode( $body, null, 512, JSON_THROW_ON_ERROR );
		} catch ( Exception $e ) {
			return false;
		}

		if ( ! isset( $json->tag_name ) ) {
			return false;
		}

		$latestVersion = sanitize_text_field( $json->tag_name );
	}

	if ( ! version_compare( $latestVersion, $pluginData['Version'], '>' ) ) {
		return false;
	}

	return [
		'id'      => $pluginData['UpdateURI'],
		'slug'    => plugin_basename( __FILE__ ),
		'version' => $latestVersion,
		'package' => 'https://github.com/code-flow/aiwriter/releases/latest/download/ai-writer.zip',

	];
}

add_filter( 'plugins_api', 'wpbuddy\ai_writer\pluginInformation', 10, 3 );

/**
 * @param bool|object|array $result
 * @param string $action
 * @param object $args
 *
 * @return bool|object|array
 * @since 0.2.0
 */
function pluginInformation( $result, string $action, object $args ) {
	if ( 'plugin_information' !== $action ) {
		return $result;
	}

	if ( $args->slug !== plugin_basename( __FILE__ ) ) {
		return $result;
	}

	return (object) [
		'name'           => 'AiWriter',
		'slug'           => plugin_basename( __FILE__ ),
		'version'        => '',
		'author'         => '<a href="https://aiwriter.space">AiWriter.space</a>',
		'author_profile' => 'https://profiles.wordpress.org/floriansimeth/',
		'homepage'       => 'https://aiwriter.space',
		'download_link'  => 'https://github.com/code-flow/aiwriter/releases/latest/download/ai-writer.zip',
		'sections'       => [
			'changelog'    => 'The <a href="https://github.com/code-flow/aiwriter/commits/main" target="_blank">changelog</a> can be found on Github.'
		],
	];
}
