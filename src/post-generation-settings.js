import {
	PanelBody,
	TextareaControl,
	Button
} from '@wordpress/components';
import {__} from '@wordpress/i18n';
import {useState} from '@wordpress/element';
import {store as noticesStore} from '@wordpress/notices';
import {useDispatch} from '@wordpress/data';

export const PostGenerationSettings = () => {
	let {AiWriter} = window;
	const {generatePost} = AiWriter;
	const [isLoading, setLoading] = useState(false);
	const [prompt, setPrompt] = useState('');
	const {createErrorNotice} = useDispatch(noticesStore);


	function createPost() {
		setLoading(true);

		generatePost(prompt).then(res => {
			setLoading(false);
			console.log(res);
		}).catch(error => {
			if (AiWriter.debug) console.error(error);
			setLoading(false);
			createErrorNotice(
				sprintf('Error: %s (%s)', error.message, error.code),
				{
					'type': 'snackbar',
					'explicitDismiss': false
				}
			);
		});

	}

	return (
		<PanelBody title={__('Post generation settings', 'aiwriter')}>
			<TextareaControl
				onChange={setPrompt}
				value={prompt}
				placeholder={
					__('Write a full 1000 word blog post, SEO optimised for the following keywords: "BMW iX M60"', 'aiwriter')
				}
				label={__('Prompt', 'aiwriter')} key="prompt"
			/>
			<Button isPrimary disabled={'' === prompt} isBusy={isLoading}
			        onClick={createPost}>{__('Generate post', 'aiwriter')}</Button>
		</PanelBody>
	);
}
