import {useSelect, useDispatch} from '@wordpress/data';
import {store as noticesStore} from '@wordpress/notices';
import {NoticeList, SnackbarList} from '@wordpress/components';

import './notices.scss';

export const Notices = () => {
	const {removeNotice} = useDispatch(noticesStore);

	let notices = useSelect(select =>
		select(noticesStore).getNotices('aiWriter')
	);

	let snackbarNotices = notices.filter(
		({type}) => type === 'snackbar'
	);

	notices = notices.filter(
		({isDismissible, type}) => type === 'default'
	);

	return (
		<>
			<NoticeList
				notices={notices}
				onRemove={id => removeNotice(id, 'aiWriter')}
				className="components-editor-notices__dismissible"
			/>

			<SnackbarList
				notices={snackbarNotices}
				className="components-editor-notices__snackbar"
				onRemove={removeNotice}
			/>
		</>
	);
}
