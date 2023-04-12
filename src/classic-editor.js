import React from 'react';
import {Settings} from "./settings";
import {Notices} from "./notices";
import {createRoot} from "@wordpress/element";

// do not uncomment the next lines as it is needed by our AiWriter.js file
import {dispatch, select} from '@wordpress/data';
import {__, sprintf} from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
// end dependencies

import './loader.scss';
import './classic-editor.scss';

if (createRoot) {
	createRoot(document.getElementById('aiWriterSettings')).render(<Settings/>);
	createRoot(document.getElementById('aiWriterNotices')).render(<Notices/>);
}
