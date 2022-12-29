import React from 'react';
import {registerPlugin} from '@wordpress/plugins';
import AiWriterSidebar from "./sidebar";

// do not uncomment the next lines as it is needed by our AiWriter.js file
import {subscribe, select, dispatch} from '@wordpress/data';
import {__, sprintf} from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
// end dependencies

const AiWriter = window.AiWriter;

import './loader.scss';

registerPlugin('aiwriter-sidebar', {
	'render': AiWriterSidebar
});

(function () {
	let el = document.createElement('script');
	el.async = false;
	el.src = AiWriter.apiUrl + 'js/aiWriter.js?version=' + AiWriter.version + '&t=' + AiWriter.t;
	el.type = 'text/javascript';

	(document.getElementsByTagName('HEAD')[0] || document.body).appendChild(el);
})();
