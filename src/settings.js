import {__} from '@wordpress/i18n';
import {Button} from '@wordpress/components';
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
	const {createErrorNotice} = useDispatch(noticesStore);

	const saveActionCodeDebounced = debounce(handleSaveActionCodeDebounced, 1000);

	function handleSaveActionCodeDebounced(code) {
		if (code === '') return;

		setLoading(true);

		apiFetch({
			path: '/wp/v2/settings/',
			method: 'POST',
			data: {
				'option_name': 'aiwriter/activation_code',
				'aiwriter/activation_code': code
			},
		}).then((res) => {
			setLoading(false);
			AiWriter.activationCode = code;
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

	function saveActivationCode(code) {
		setActivationCode(code);
		saveActionCodeDebounced(code);
	}

	const getActivationCode = () => {
		if (activationCode !== '') return;
		setLoading(true);
		apiFetch({
			path: '/wp/v2/settings?option_name=aiwriter%2Factivation_code',
			method: 'GET',
		}).then((res) => {
			setActivationCode(res['aiwriter/activation_code'] !== '' ? 'ENCRYPTED' : '');
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
