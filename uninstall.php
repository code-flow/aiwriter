<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit();
}

if ( ! WP_UNINSTALL_PLUGIN ) {
	exit();
}

delete_option( 'aiwriter/activation_code' );

global $wpdb;

$wpdb->delete( $wpdb->usermeta, [ 'meta_key' => 'aiwriter_isActive' ] );
$wpdb->delete( $wpdb->usermeta, [ 'meta_key' => 'aiwriter_temperature' ] );
$wpdb->delete( $wpdb->usermeta, [ 'meta_key' => 'aiwriter_textLength' ] );
$wpdb->delete( $wpdb->usermeta, [ 'meta_key' => 'aiwriter_onboardingCompleted' ] );
