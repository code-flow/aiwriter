import React from 'react';
import domReady from '@wordpress/dom-ready';

import './chat-window.scss';

domReady(function () {
	(function () {
		let el = document.createElement('script');
		el.async = false;
		el.src = AiWriter.apiUrl + 'js/aiWriterChat.js?version=' + AiWriter.version + '&t=' + AiWriter.t;
		el.type = 'text/javascript';

		document.body.appendChild(el);
	})();

});
