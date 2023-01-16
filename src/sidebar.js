import {__} from '@wordpress/i18n';
import {
	PluginSidebar,
	PluginSidebarMoreMenuItem
} from '@wordpress/edit-post';

import {AiWriterIcon} from "./icons";
import {Settings} from "./settings";
// import {Spinner} from '@wordpress/components';
// Snackbar -> core/notice data store: https://developer.wordpress.org/block-editor/reference-guides/data/data-core-notices/

const AiWriterSidebar = () => {
	return (<>
			<PluginSidebarMoreMenuItem
				target="aiwriter-sidebar" icon={AiWriterIcon()}>
				{__('AiWriter settings', 'aiwriter')}
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="aiwriter-sidebar"
				title={__('AiWriter settings', 'aiwriter')} icon={AiWriterIcon()}>
				<Settings />
			</PluginSidebar>
		</>
	)
}

export default AiWriterSidebar;
