<?php
/**
 * Plugin Name:       AiWriter
 * Description:       Automatic WordPress AI Writer, Copywriting Assistant & Content Repurposer
 * Requires at least: 6.2
 * Requires PHP:      8.0.0
 * Version:           0.10.3
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

define( 'AIWRITER_API_URL', 'https://api.aiwriter.space/api/' );
define( 'AIWRITER_STREAM_URL', 'https://stream.aiwriter.workers.dev' );

add_action( 'init', 'wpbuddy\ai_writer\loadTranslation' );

function loadTranslation(): void {
	load_plugin_textdomain( 'aiwriter', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
}

add_action( 'init', 'wpbuddy\ai_writer\registerSettings' );

/**
 * @return void
 * @since 0.1.0
 */
function registerSettings(): void {

	$cryptoHelper = static function ( $value ) {
		static $cryptoValue = null;

		# avoid double encryption
		if ( is_string( $cryptoValue ) ) {
			return $cryptoValue;
		}

		$cryptoValue = cryptoHelper( $value );

		return $cryptoValue;
	};

	register_setting(
		'options',
		'aiwriter/activation_code',
		[
			'type'              => 'string',
			'sanitize_callback' => $cryptoHelper,
			'show_in_rest'      => true,
			'default'           => ''
		]
	);

	register_setting(
		'options',
		'aiwriter/openai_secret_key',
		[
			'type'              => 'string',
			'sanitize_callback' => $cryptoHelper,
			'show_in_rest'      => true,
			'default'           => ''
		]
	);

	register_meta(
		'user',
		'aiwriter_isActive',
		[
			'type'              => 'boolean',
			'description'       => __( 'If AiWriter is active for this user.', 'aiwriter' ),
			'single'            => true,
			'default'           => true,
			'show_in_rest'      => true,
			'sanitize_callback' => static function ( $val ) {
				return (bool) $val;
			},
			'auth_callback'     => static function ( $allowed, $meta_key, $object_id, $user_id, $cap, $caps ) {
				return is_user_logged_in() && get_current_user_id() === $user_id;
			},
		]
	);

	register_meta(
		'user',
		'aiwriter_isBlockAiActive',
		[
			'type'              => 'boolean',
			'description'       => __( 'If Block Ai functionality is active for this user.', 'aiwriter' ),
			'single'            => true,
			'default'           => false,
			'show_in_rest'      => true,
			'sanitize_callback' => static function ( $val ) {
				return (bool) $val;
			},
			'auth_callback'     => static function ( $allowed, $meta_key, $object_id, $user_id, $cap, $caps ) {
				return is_user_logged_in() && get_current_user_id() === $user_id;
			},
		]
	);

	register_meta(
		'user',
		'aiwriter_onboardingCompleted',
		[
			'type'              => 'boolean',
			'description'       => __( 'If the onboarding process has been completed.', 'aiwriter' ),
			'single'            => true,
			'default'           => false,
			'show_in_rest'      => true,
			'sanitize_callback' => static function ( $val ) {
				return (bool) $val;
			},
			'auth_callback'     => static function ( $allowed, $meta_key, $object_id, $user_id, $cap, $caps ) {
				return is_user_logged_in() && get_current_user_id() === $user_id;
			},
		]
	);

	register_meta(
		'user',
		'aiwriter_temperature',
		[
			'type'              => 'number',
			'description'       => __( 'The temperature that was set by the user. Value from 0.0 to 1.0.', 'aiwriter' ),
			'single'            => true,
			'default'           => 0.8,
			'show_in_rest'      => true,
			'sanitize_callback' => static function ( $val ) {
				return (float) $val;
			},
			'auth_callback'     => static function ( $allowed, $meta_key, $object_id, $user_id, $cap, $caps ) {
				return is_user_logged_in() && get_current_user_id() === $user_id;
			},
		]
	);

	register_meta(
		'user',
		'aiwriter_textLength',
		[
			'type'              => 'integer',
			'description'       => __( 'The text length that was set by the user. Value from 200 to 1000.', 'aiwriter' ),
			'single'            => true,
			'default'           => 200,
			'show_in_rest'      => true,
			'sanitize_callback' => static function ( $val ) {
				return (int) $val;
			},
			'auth_callback'     => static function ( $allowed, $meta_key, $object_id, $user_id, $cap, $caps ) {
				return is_user_logged_in() && get_current_user_id() === $user_id;
			},
		]
	);
}

/**
 * @return string
 * @since 0.5.0
 */
function getCurrentUserFirstname(): string {

	$user = wp_get_current_user();

	$first_name = get_user_meta( $user->ID, 'first_name', true );

	if ( ! empty( $first_name ) ) {
		return $first_name;
	}

	return $user->display_name;
}

add_action( 'rest_api_init', 'wpbuddy\ai_writer\setupRestRoutes' );

/**
 * Gets the API URL.
 * @return string
 * @since 0.5.0
 */
function getApiUrl(): string {
	$apiUrl = AIWRITER_API_URL;

	if ( defined( 'WP_DEBUG' ) && WP_DEBUG && defined( 'AIWRITER_DEV_API_URL' ) ) {
		$apiUrl = trailingslashit( AIWRITER_DEV_API_URL );
	}

	return $apiUrl;
}

function getStreamUrl(): string {
	$streamUrl = AIWRITER_STREAM_URL;

	if ( defined( 'WP_DEBUG' ) && WP_DEBUG && defined( 'AIWRITER_DEV_STREAM_URL' ) ) {
		$streamUrl = trailingslashit( AIWRITER_DEV_STREAM_URL );
	}

	return $streamUrl;
}

function getStreamTokenUrl(): string {
	$url = untrailingslashit( getStreamUrl() ) . '/fetch-token';

	if ( defined( 'AIWRITER_DEV_STREAM_URL' ) ) {
		$url = add_query_arg( 'env', wp_get_environment_type(), $url );
	}

	return $url;
}


/**
 * Fetches the API token.
 *
 * @param WP_REST_Request $request
 *
 * @return WP_REST_Response|WP_Error|WP_HTTP_Response
 * @since 0.6.0
 */
function restGetToken( WP_REST_Request $request ): WP_REST_Response|WP_Error|WP_HTTP_Response {
	$activationCodeEncrypted = get_option( 'aiwriter/activation_code', '' );

	if ( empty( $activationCodeEncrypted ) ) {
		return new WP_Error(
			'ai-writer-no-license-information',
			sprintf(
				__( 'Hey %s, it looks like you haven\'t added your licence information yet. Enter the licence key / purchase code in the settings (on the right side) and you\'re good to go.', 'aiwriter' ),
				getCurrentUserFirstname()
			),
			[
				'action'       => 'openSettings',
				'moreMessages' => [
					[
						'message'   => __( 'If you don\'t have a license key, sign up for our newsletter and gain access to all features for 7 days. Our newsletter provides valuable tips on how to fully utilize the AI and subscribing will make you a pro-user with access to exclusive best-practice information.', 'aiwriter' ),
						'buttonUrl' => 'https://aiwriter.space/7-day-trial.html'
					]
				],
			]
		);
	}

	try {
		$activationCode = cryptoHelper( $activationCodeEncrypted, 'decrypt' );
	} catch ( Exception $e ) {
		return new WP_Error(
			'ai-writer-token-rest-crypto-error',
			sprintf( __( 'Could not decrypt your activation code. Got error: %s', 'aiwriter' ), $e->getMessage() ),
		);
	}

	$openAiSecretKeyEncrypted = trim( get_option( 'aiwriter/openai_secret_key', '' ) );

	if ( ! empty( $openAiSecretKeyEncrypted ) ) {
		try {
			$openAiSecretKey = cryptoHelper( $openAiSecretKeyEncrypted, 'decrypt' );
		} catch ( Exception $e ) {
			return new WP_Error(
				'ai-writer-token-rest-crypto-error',
				sprintf( __( 'Could not decrypt your Open AI Secret Key code. Got error: %s', 'aiwriter' ), $e->getMessage() ),
			);
		}
	} else {
		$openAiSecretKey = '';
	}

	$response = wp_remote_post(
		getStreamTokenUrl(),
		[
			'headers'     => [
				'Authorization' => 'Bearer ' . $activationCode,
				'Content-Type'  => 'application/json; charset=utf-8'
			],
			'body'        => json_encode( [ 'open_ai_secret_key' => $openAiSecretKey ] ),
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
			'ai-writer-token-response-json',
			$e->getMessage(),
		);
	}

	if ( $response->get_status() < 200 || $response->get_status() >= 300 ) {

		if ( isset( $body->data ) && isset( $body->data->message ) ) {
			return new WP_Error(
				'ai-writer-token-response-status-code',
				sprintf(
					__( 'Could not fetch token from API (wrong status code) with error: %s (%d)', 'aiwriter' ),
					$body->data->message,
					$body->data->code,
				),
				$response
			);
		}

		if ( isset( $body->code, $body->message ) ) {
			return new WP_Error(
				'ai-writer-token-response-status-code',
				sprintf(
					__( 'Could not fetch token from API. Got error: %s (%d)', 'aiwriter' ),
					$body->message,
					$body->code,
				),
				$response
			);
		}

		return new WP_Error(
			'ai-writer-token-response-status-code',
			__( 'Could not fetch token from API (wrong status code).', 'aiwriter' ),
			$response
		);
	}

	if ( ! isset( $body->id ) ) {
		return new WP_Error(
			'ai-writer-token-response-token',
			__( 'Could not fetch token from API (no string).', 'aiwriter' ),
			$response
		);
	}

	return rest_ensure_response( [
		'token' => $body->id
	] );
}

/**
 * @param WP_REST_Request $request
 *
 * @return WP_REST_Response|WP_Error|WP_HTTP_Response
 * @since 0.1.0
 * @deprecated 0.6.0
 */
function restComplete( WP_REST_Request $request ): WP_REST_Response|WP_Error|WP_HTTP_Response {

	$activationCodeEncrypted = get_option( 'aiwriter/activation_code', '' );

	if ( empty( $activationCodeEncrypted ) ) {
		return new WP_Error(
			'ai-writer-no-license-information',
			sprintf(
				__( 'Hey %s, it looks like you haven\'t added your licence information yet. Enter the licence key / purchase code in the settings (on the right side) and you\'re good to go.', 'aiwriter' ),
				getCurrentUserFirstname()
			),
			[
				'action'       => 'openSettings',
				'moreMessages' => [
					[
						'message'   => __( 'If you don\'t have a license key, sign up for our newsletter and gain access to all features for 7 days. Our newsletter provides valuable tips on how to fully utilize the AI and subscribing will make you a pro-user with access to exclusive best-practice information.', 'aiwriter' ),
						'buttonUrl' => 'https://aiwriter.space/7-day-trial.html'
					]
				],
			]
		);
	}

	try {
		$activationCode = cryptoHelper( $activationCodeEncrypted, 'decrypt' );
	} catch ( Exception $e ) {
		return new WP_Error(
			'ai-writer-gpt-rest-crypto-error',
			sprintf( __( 'Could not decrypt your activation code. Got error: %s', 'aiwriter' ), $e->getMessage() ),
		);
	}

	$body = [
		'model'             => "gpt-3.5-turbo-instruct",
		'prompt'            => $request->get_param( 'prompt' ),
		'temperature'       => (float) $request->get_param( 'temperature' ),
		'max_tokens'        => (int) $request->get_param( 'max_tokens' ),
		'frequency_penalty' => (float) $request->get_param( 'frequency_penalty' ),
		'presence_penalty'  => (float) $request->get_param( 'presence_penalty' ),
		'top_p'             => (float) $request->get_param( 'top_p' ),
		'stream'            => false
	];

	$response = wp_remote_post(
		getApiUrl(),
		[
			'headers'     => [
				'Authorization' => 'Bearer ' . $activationCode,
				'Content-Type'  => 'application/json; charset=utf-8'
			],
			'body'        => json_encode( $body ),
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
		'text' => $body->text
	] );
}

/**
 * @return void
 * @since 0.1.0
 */
function setupRestRoutes(): void {
	# @deprecated 0.6.0
	register_rest_route( 'wpbuddy/ai-writer/v1', 'completions', [
		'methods'             => \WP_REST_Server::CREATABLE,
		'callback'            => 'wpbuddy\ai_writer\restComplete',
		'permission_callback' => static function () {

			return current_user_can( 'edit_posts' );
		},
		'args'                => [
			'prompt'            => [
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => function ( $param ) {

					return sanitize_text_field( $param );
				},
			],
			'temperature'       => [
				'type'             => 'number',
				'exclusiveMinimum' => 0,
				'exclusiveMaximum' => 1,
			],
			'max_tokens'        => [
				'type'             => 'integer',
				'exclusiveMinimum' => 1,
				'exclusiveMaximum' => 4096,
			],
			'presence_penalty'  => [
				'type'             => 'number',
				'exclusiveMinimum' => - 2.0,
				'exclusiveMaximum' => 2.0,
				'default'          => 0,
			],
			'frequency_penalty' => [
				'type'             => 'number',
				'exclusiveMinimum' => - 2.0,
				'exclusiveMaximum' => 2.0,
				'default'          => 0,
			],
			'top_p'             => [
				'type'             => 'number',
				'minimum'          => 0.0,
				'exclusiveMaximum' => 1.0,
				'default'          => 1,
			]
		],
	] );

	register_rest_route( 'wpbuddy/ai-writer/v1', 'token', [
		'methods'             => \WP_REST_Server::READABLE,
		'callback'            => 'wpbuddy\ai_writer\restGetToken',
		'permission_callback' => static function () {

			return current_user_can( 'edit_posts' );
		}
	] );
}


add_action( 'admin_init', 'wpbuddy\ai_writer\registerScripts' );

/**
 * @return void
 * @since 0.1.0
 */
function registerScripts(): void {
	$assetBlockEditor = include __DIR__ . '/build/blockEditor.asset.php';

	wp_register_script(
		'ai-writer-block-editor',
		plugins_url( '/build/blockEditor.js', __FILE__ ),
		$assetBlockEditor['dependencies'],
		$assetBlockEditor['version'],
		true
	);

	wp_register_style(
		'ai-writer-block-editor',
		plugins_url( '/build/blockEditor.css', __FILE__ ),
		[],
		$assetBlockEditor['version']
	);

	$assetClassicEditor = include __DIR__ . '/build/classicEditor.asset.php';

	wp_register_script(
		'ai-writer-classic-editor',
		plugins_url( '/build/classicEditor.js', __FILE__ ),
		array_merge( $assetClassicEditor['dependencies'], [ 'wp-tinymce' ] ),
		$assetClassicEditor['version'],
		true
	);

	wp_register_style(
		'ai-writer-classic-editor',
		plugins_url( '/build/classicEditor.css', __FILE__ ),
		[ 'wp-components' ],
		$assetClassicEditor['version']
	);

	$assetsChatWindow = include __DIR__ . '/build/chatWindow.asset.php';

	wp_register_script(
		'ai-writer-chat-window',
		plugins_url( '/build/chatWindow.js', __FILE__ ),
		$assetsChatWindow['dependencies'],
		$assetsChatWindow['version'],
		true
	);

	wp_register_style(
		'ai-writer-chat-window',
		plugins_url( '/build/chatWindow.css', __FILE__ ),
		[],
		$assetsChatWindow['version']
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

	if ( ! function_exists( 'get_plugin_data' ) ) {
		$file = ABSPATH . 'wp-admin/includes/plugin.php';

		if ( is_file( $file ) ) {
			require $file;
		} else {
			return;
		}
	}

	$pluginData = get_plugin_data( __FILE__, false, false );

	$data = (object) [
		'debug'           => defined( 'WP_DEBUG' ) && WP_DEBUG && defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG,
		'isActive'        => (bool) get_user_meta( get_current_user_id(), 'aiwriter_isActive', true ),
		'isBlockAiActive' => (bool) get_user_meta( get_current_user_id(), 'aiwriter_isBlockAiActive', true ),
		'startOnboarding' => ! (bool) get_user_meta( get_current_user_id(), 'aiwriter_onboardingCompleted', true ),
		'version'         => $pluginData['Version'],
		't'               => wp_generate_uuid4(),
		'apiUrl'          => getApiUrl(),
		'temperature'     => (float) get_user_meta( get_current_user_id(), 'aiwriter_temperature', true ),
		'textLength'      => (int) get_user_meta( get_current_user_id(), 'aiwriter_textLength', true ),
		'upgradeUrl'      => self_admin_url( 'update-core.php?force-check=1' ),
		'userFirstName'   => getCurrentUserFirstname(),
		'userEmail'       => wp_get_current_user()->user_email,
		'editorType'      => $screen->is_block_editor ? 'block' : 'classic',
		'language'        => get_locale(),
		'env'             => wp_get_environment_type(),
	];

	if ( str_contains( site_url(), 'https://playground.wordpress.net' ) ) {
		try {
			$openAiSecretKeyEncrypted = trim( get_option( 'aiwriter/openai_secret_key', '' ) );
			$data->openAiSecretKey    = cryptoHelper( $openAiSecretKeyEncrypted, 'decrypt' );
		} catch ( Exception $e ) {
		}
	}

	if ( $screen->is_block_editor ) {
		$editor = 'block';
	} else {
		$editor = 'classic';
	}

	wp_enqueue_script( 'ai-writer-' . $editor . '-editor' );
	wp_enqueue_style( 'ai-writer-' . $editor . '-editor' );

	add_editor_style( plugins_url( '/build/classicEditor.css', __FILE__ ), );

	wp_add_inline_script(
		'ai-writer-' . $editor . '-editor',
		sprintf(
			'window.AiWriter = %s',
			json_encode( $data )
		),
		'before'
	);

	wp_enqueue_script( 'ai-writer-chat-window' );
	wp_enqueue_style( 'ai-writer-chat-window' );
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
		'package' => 'https://github.com/code-flow/aiwriter/releases/latest/download/aiwriter.zip',
		'icons'   => [
			'svg'     => '',
			'2x'      => 'https://aiwriter.space/public/assets/images/ai-writer-logo.jpg',
			'1x'      => '',
			'default' => 'https://aiwriter.space/public/assets/images/ai-writer-logo.jpg'
		]

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

	if ( ! function_exists( 'get_plugin_data' ) ) {
		$file = ABSPATH . 'wp-admin/includes/plugin.php';

		if ( is_file( $file ) ) {
			require $file;
		} else {
			return $result;
		}
	}

	$pluginData = get_plugin_data( __FILE__, false, false );

	$latestData = checkPluginUpdate( false, $pluginData );

	$latestVersion = is_array( $latestData ) && array_key_exists( 'version', $latestData ) ? $latestData['version'] : '';

	return (object) [
		'name'           => 'AiWriter',
		'slug'           => plugin_basename( __FILE__ ),
		'version'        => $latestVersion,
		'author'         => '<a href="https://aiwriter.space">AiWriter.space</a>',
		'author_profile' => 'https://profiles.wordpress.org/floriansimeth/',
		'homepage'       => 'https://aiwriter.space',
		'download_link'  => 'https://github.com/code-flow/aiwriter/releases/latest/download/aiwriter.zip',
		'sections'       => [
			'changelog' => sprintf(
				'The <a href="https://github.com/code-flow/aiwriter/commits/%s/" target="_blank">changelog</a> can be found on Github.',
				$latestVersion
			)
		],
	];
}

add_action( 'add_meta_boxes', 'wpbuddy\ai_writer\addMetaBoxes' );

/**
 * @return void
 * @since 0.4.0
 */
function addMetaBoxes(): void {
	add_meta_box(
		'aiwriter-settings',
		__( 'AiWriter Settings', 'aiwriter' ),
		'wpbuddy\ai_writer\classicEditorMetaBoxSettings',
		get_current_screen(),
		'side',
		'core',
		[
			'__block_editor_compatible_meta_box' => false,
			'__back_compat_meta_box'             => true,
		]
	);
}

/**
 * @return void
 * @since 0.4.0
 */
function classicEditorMetaBoxSettings(): void {
	echo '<div id="aiWriterSettings"></div>';
}

add_action( 'edit_form_after_editor', 'wpbuddy\ai_writer\adminPostsFooterClassicEditor' );

/**
 * @return void
 * @since 0.4.0
 * @since 0.8.0 Renamed from `adminPostsFooter`
 */
function adminPostsFooterClassicEditor(): void {
	echo '<div id="aiWriterNotices"></div>';
}

add_action( 'after_wp_tiny_mce', 'wpbuddy\ai_writer\classicEditorTinyMceScripts' );

/**
 * @return void
 * @since 0.4.0
 */
function classicEditorTinyMceScripts(): void {
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

	if ( $screen->is_block_editor ) {
		return;
	}

	?>
	<script>
		tinymce.on('addeditor', function (event) {
			let el = document.createElement('script');
			el.async = false;
			el.src = window.AiWriter.apiUrl + 'js/aiWriterClassicEditor.js?version=' + AiWriter.version + '&t=' + AiWriter.t;
			el.type = 'text/javascript';

			(document.getElementsByTagName('HEAD')[0] || document.body).appendChild(el);
		}, true);
	</script>
	<?php
}


add_action( 'admin_footer-post-new.php', 'wpbuddy\ai_writer\adminPostsFooter' );
add_action( 'admin_footer-post.php', 'wpbuddy\ai_writer\adminPostsFooter' );

/**
 * @return void
 * @since 0.8.0
 */
function adminPostsFooter(): void {
	echo '<div id="aiWriterChat"></div>';
}
