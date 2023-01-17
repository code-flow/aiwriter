import React from 'react';
import * as ReactDOM from 'react-dom';
import {Settings} from "./settings";
import {Notices} from "./notices";

// do not uncomment the next lines as it is needed by our AiWriter.js file
import {subscribe, select, dispatch} from '@wordpress/data';
import {__, sprintf} from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
// end dependencies

const AiWriter = window.AiWriter;

import './loader.scss';
import './classic-editor.scss';

(function () {
	let el = document.createElement('script');
	el.async = false;
	el.src = AiWriter.apiUrl + 'js/aiWriterClassicEditor.js?version=' + AiWriter.version + '&t=' + AiWriter.t;
	el.type = 'text/javascript';

	(document.getElementsByTagName('HEAD')[0] || document.body).appendChild(el);
})();

ReactDOM.render(<Settings/>, document.getElementById('aiWriterSettings'));
ReactDOM.render(<Notices/>, document.getElementById('aiWriterNotices'));
