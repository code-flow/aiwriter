import {PanelBody, Spinner, Button} from '@wordpress/components';
import {useState} from '@wordpress/element';
import {__} from '@wordpress/i18n';
import {dispatch} from '@wordpress/data';

export const TitleSuggestionSettings = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [titles, setTitles] = useState([]);

	const {AiWriter} = window;
	const {suggestTitles} = AiWriter;

	const fetchTitles = async () => {
		if (isLoading) return;
		if (titles.length > 0) return;

		setIsLoading(true);

		let ts = await suggestTitles();

		setTitles([...ts]);

		setIsLoading(false);
	};

	return <PanelBody
		title={__('Title Suggestions', 'aiwriter')}
		initialOpen={false}
		onToggle={fetchTitles}>
		{isLoading && <Spinner/>}
		<ul>
			{titles.map((title, index) => <li key={index}><Button
				onClick={() => {
					dispatch( 'core/editor' ).editPost( { 'title': title } );
				}}
				variant="link">{title}</Button></li>)}
		</ul>
	</PanelBody>
}
