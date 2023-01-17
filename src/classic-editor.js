import React from 'react';
import * as ReactDOM from 'react-dom';
import {Settings} from "./settings";
import {Notices} from "./notices";

// do not uncomment the next lines as it is needed by our AiWriter.js file
import {subscribe, select, dispatch} from '@wordpress/data';
import {__, sprintf} from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
// end dependencies

import './loader.scss';
import './classic-editor.scss';

ReactDOM.render(<Settings/>, document.getElementById('aiWriterSettings'));
ReactDOM.render(<Notices/>, document.getElementById('aiWriterNotices'));
