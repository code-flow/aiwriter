const defaultConfig = require('@wordpress/scripts/config/webpack.config');

const {getWebpackEntryPoints} = require('@wordpress/scripts/utils/config');

// defaultConfig.output.path = __dirname + '/public/api/js';

module.exports = {
	...defaultConfig,
	entry: {
		...getWebpackEntryPoints(),
		blockEditor: './src/block-editor.js',
		classicEditor: './src/classic-editor.js'
	}
}
