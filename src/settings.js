import {__} from '@wordpress/i18n';
import {Button, Spinner} from '@wordpress/components';
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

export const Settings = () => {
	let {AiWriter} = window;
	const [isLoading, setLoading] = useState(false);

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
				'aiwriter/openai_secret_key': code
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
		setOpenAiSecretKey(key);
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

	return (
		<>
			<TextGenerationSettings/>
			<PanelBody title={__('Your subscription', 'aiwriter')} initialOpen={false}
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
							<p><a href="https://billing.aiwriter.space/p/login/aEU4jGfC87qg7NSaEE"
							      target="_blank">{__('Manage your subscription', 'aiwriter')}</a></p>
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
