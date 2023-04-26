import React from 'react';
import {registerPlugin} from '@wordpress/plugins';
import AiWriterSidebar from "./sidebar";

// do not uncomment the next lines as it is needed by our AiWriter.js file
import {subscribe, select, dispatch} from '@wordpress/data';
import {__, sprintf} from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import {serialize, createBlock, pasteHandler} from '@wordpress/blocks';
import {addFilter} from '@wordpress/hooks';
import {createHigherOrderComponent} from '@wordpress/compose';
import {PanelBody, TextControl} from '@wordpress/components';
import {Fragment, useState} from '@wordpress/element';
import {compose} from '@wordpress/compose';
import {useBlockProps, InnerBlocks} from '@wordpress/block-editor';
// end dependencies

const AiWriter = window.AiWriter;

import './loader.scss';
import './block-with-prompt.scss';

registerPlugin('aiwriter', {
	'render': AiWriterSidebar
});

(function () {
	let el = document.createElement('script');
	el.async = false;
	el.src = AiWriter.apiUrl + 'js/aiWriter.js?version=' + AiWriter.version + '&t=' + AiWriter.t;
	el.type = 'text/javascript';

	document.body.appendChild(el);
})();

