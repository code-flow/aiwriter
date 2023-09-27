import {__} from '@wordpress/i18n';
import {Button, Spinner, FormToggle} from '@wordpress/components';
import debounce from 'lodash/debounce';
import {useState} from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {useDispatch} from '@wordpress/data';
import {store as noticesStore} from '@wordpress/notices';
import {
	PanelBody,
	TextControl
} from '@wordpress/components';
import {TextGenerationSettings} from "./text-generation-settings";
import {TitleSuggestionSettings} from "./title-suggestion-settings";

export const Settings = () => {
	let {AiWriter} = window;
	const {events} = AiWriter;
	const [isLoading, setLoading] = useState(false);
	const [isBlockAiActive, setIsBlockAiActive] = useState(AiWriter.isBlockAiActive);

	const [activationCode, setActivationCode] = useState('');
	const [openAiSecretKey, setOpenAiSecretKey] = useState('');
	const {createErrorNotice} = useDispatch(noticesStore);

	const saveActionCodeDebounced = debounce(handleSaveActionCodeDebounced, 1000);
	const saveOpenAiSecretKeyDebounced = debounce(handleOpenAiSecretKeyDebounced, 1000);

	function handleOpenAiSecretKeyDebounced(key) {
		if (key === '') return;

		const {editorType} = window.AiWriter;

		setLoading(true);

		apiFetch({
			path: '/wp/v2/settings/',
			method: 'POST',
			data: {
				'option_name': 'aiwriter/openai_secret_key',
				'aiwriter/openai_secret_key': key
			},
		}).then(res => {
			setLoading(false);
		}).catch(error => {
			if (AiWriter.debug) console.error(error);
			setLoading(false);
			createErrorNotice(
				sprintf('Error: %s (%s)', error.message, error.code),
				{
					'type': 'snackbar',
					'explicitDismiss': false,
					'context': editorType === 'classic' ? 'aiWriter' : 'global',
				}
			);
		});
	}

	function handleSaveActionCodeDebounced(code) {
		if (code === '') return;

		const {editorType} = window.AiWriter;

		setLoading(true);

		apiFetch({
			path: '/wp/v2/settings/',
			method: 'POST',
			data: {
				'option_name': 'aiwriter/activation_code',
				'aiwriter/activation_code': code
			},
		}).then(res => {
			setLoading(false);
		}).catch(error => {
			if (AiWriter.debug) console.error(error);
			setLoading(false);
			createErrorNotice(
				sprintf('Error: %s (%s)', error.message, error.code),
				{
					'type': 'snackbar',
					'explicitDismiss': false,
					'context': editorType === 'classic' ? 'aiWriter' : 'global',
				}
			);
		});
	}

	function saveOpenAiSecretKey(key) {
		const {nonceEndpoint} = apiFetch;

		setOpenAiSecretKey(key);

		const isPlayground = nonceEndpoint.indexOf('https://playground.wordpress.net') !== -1;
		if (isPlayground) {
			window.AiWriter.openAiSecretKey = key;
		}

		saveOpenAiSecretKeyDebounced(key);
	}

	function saveActivationCode(code) {
		setActivationCode(code);
		saveActionCodeDebounced(code);
	}

	const getOpenAiSecretKey = () => {
		if (openAiSecretKey !== '') return;
		const {editorType} = window.AiWriter;
		setLoading(true);
		apiFetch({
			path: '/wp/v2/settings?option_name=aiwriter%2Fopenai_secret_key',
			method: 'GET',
		}).then(res => {
			setOpenAiSecretKey(res['aiwriter/openai_secret_key'] !== '' ? 'ENCRYPTED' : '');
			setLoading(false);
		}).catch(error => {
			if (AiWriter.debug) console.error(error);
			setLoading(false);
			createErrorNotice(
				sprintf('Error: %s (%s)', error.message, error.code),
				{
					'type': 'snackbar',
					'explicitDismiss': false,
					'context': editorType === 'classic' ? 'aiWriter' : 'global',
				}
			);
		});
	}

	const getActivationCode = () => {
		if (activationCode !== '') return;
		setLoading(true);
		const {editorType} = window.AiWriter;
		apiFetch({
			path: '/wp/v2/settings?option_name=aiwriter%2Factivation_code',
			method: 'GET',
		}).then(res => {
			setActivationCode(res['aiwriter/activation_code'] !== '' ? 'ENCRYPTED' : '');
			setLoading(false);
		}).catch(error => {
			if (AiWriter.debug) console.error(error);
			setLoading(false);
			createErrorNotice(
				sprintf('Error: %s (%s)', error.message, error.code),
				{
					'type': 'snackbar',
					'explicitDismiss': false,
					'context': editorType === 'classic' ? 'aiWriter' : 'global',
				}
			);
		});
	}

	const updateUserMeta = (field, value) => {
		let meta = {};
		meta['aiwriter_' + field] = value;
		setLoading(true);
		apiFetch({
			path: '/wp/v2/users/me/',
			method: 'POST',
			data: {
				'meta': meta,
			},
		}).then((res) => {
			AiWriter[field] = value;
			setLoading(false);
		}).catch((error) => {
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
		<>
			<TitleSuggestionSettings/>
			<TextGenerationSettings/>
			<PanelBody title={__('Ai Chat', 'aiwriter')} initialOpen={true}>
				<Button icon="format-chat" variant="primary" onClick={() => {
					events.dispatch('aiWriter.chatOpen', true);
				}}>{__('Start Ai Chat', 'aiwriter')}</Button>
			</PanelBody>
			<PanelBody title={__('Block Ai', 'aiwriter')} initialOpen={false}>
				<p>
					<FormToggle
						checked={isBlockAiActive}
						onChange={e => {
							setIsBlockAiActive(e.target.checked);
							AiWriter.isBlockAiActive = e.target.checked;
							updateUserMeta('isBlockAiActive', e.target.checked);
						}}
					/>
					{' '}
					{__('Activate BlockAi (Experimental)', 'aiwriter')}
				</p>
			</PanelBody>
			<PanelBody title={__('Your license', 'aiwriter')} initialOpen={false}
			           onToggle={getActivationCode}>
				{
					activationCode === 'ENCRYPTED'
						? <>
							<p>
								{__('Activation code already entered.', 'aiwriter')}
								{' '}
								<Button variant='link'
								        onClick={() => setActivationCode('')}>{__('Edit', 'aiwriter')}</Button>
							</p>
						</>
						: <TextControl
							onChange={saveActivationCode}
							value={activationCode === 'ENCRYPTED' ? '' : activationCode}
							placeholder={
								isLoading
									? __('Loading code ...', 'aiwriter')
									: activationCode === 'ENCRYPTED' ? __('**encrypted**', 'aiwriter') : 'abcdefghijklmnopqrstuvwxyz='
							}
							label={__('Activation code', 'aiwriter')} key="activation-code"
						/>
				}

				{activationCode === '' && !isLoading
					?
					<p key="buy-now"><a href="https://aiwriter.space"
					                    target="_blank">{__('Don\'t have an activation code yet? Click here.', 'aiwriter')}</a>
					</p>
					: null}

				{isLoading ? <Spinner/> : null}

				<p><a href="https://wp-buddy.com/blog/where-to-find-your-envato-purchase-code/"
				      target="_blank">{__('Where to find your Envato purchase code', 'aiwriter')}</a></p>
			</PanelBody>
			<PanelBody title={__('OpenAi', 'aiwriter')} initialOpen={false} onToggle={getOpenAiSecretKey}>
				<p key="openai-api-descriptions">{__('After the free trial period, you will need a secret key from OpenAI for this plugin to work properly.', 'aiwriter')}</p>
				{
					openAiSecretKey === 'ENCRYPTED'
						? <>
							<p>
								{__('OpenAI secret key already entered.', 'aiwriter')}
								{' '}
								<Button variant='link'
								        onClick={() => setOpenAiSecretKey('')}>{__('Edit', 'aiwriter')}</Button>
							</p>
						</>
						: <TextControl
							onChange={saveOpenAiSecretKey}
							value={openAiSecretKey === 'ENCRYPTED' ? '' : openAiSecretKey}
							placeholder={
								isLoading
									? __('Loading code ...', 'aiwriter')
									: openAiSecretKey === 'ENCRYPTED' ? __('**encrypted**', 'aiwriter') : 'abcdefghijklmnopqrstuvwxyz='
							}
							label={__('OpenAi API Key', 'aiwriter')} key="activation-code"
						/>
				}
				{openAiSecretKey === '' && !isLoading
					?
					<p key="openai-api-keys"><a href="https://platform.openai.com/account/api-keys"
					                            target="_blank">{__('Don\'t have a secret key yet? Click here.', 'aiwriter')}</a>
					</p>
					: null}
				{isLoading ? <Spinner/> : null}
			</PanelBody>

			<PanelBody title={__('FAQ & Features', 'aiwriter')} initialOpen={false}>
				<ul>
					<li>
						<Button variant="link" icon="external" iconSize={5} target="_blank"
						        href="https://aiwriter.space/faq.html">{__('Frequently asked questions', 'aiwriter')}</Button>
					</li>
					<li>
						<Button variant="link" icon="external" iconSize={5} target="_blank"
						        href="https://aiwriterwp.canny.io/feature-requests">{__('Feature requests', 'aiwriter')}</Button>
					</li>
				</ul>
			</PanelBody>
		</>
	);
}
