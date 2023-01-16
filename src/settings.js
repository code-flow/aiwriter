import {__} from '@wordpress/i18n';
import {RangeControl, Button} from '@wordpress/components';
import debounce from 'lodash/debounce';
import {useState} from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {useDispatch} from '@wordpress/data';
import {store as noticesStore} from '@wordpress/notices';
import {
	PanelBody,
	TextControl,
	FormToggle
} from '@wordpress/components';

export const Settings = () => {
	let {AiWriter} = window;
	const [isActive, setIsActive] = useState(AiWriter.isActive);
	const [isLoading, setLoading] = useState(false);
	const [temperature, setTemperature] = useState(AiWriter.temperature);
	const [textLength, setTextLength] = useState(AiWriter.textLength);
	const [activationCode, setActivationCode] = useState('');
	const {createErrorNotice} = useDispatch(noticesStore);

	const updateUserMetaDebounced = debounce(updateUserMeta, 2000);
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

	function updateUserMeta(field, value) {
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
			<PanelBody title={__('Text generation settings', 'aiwriter')}>
				<p>
					<FormToggle
						checked={isActive}
						onChange={() => {
							setIsActive(state => !state);
							AiWriter.isActive = !isActive;
							updateUserMeta('isActive', AiWriter.isActive);
						}}
					/>
					{' '}
					{__('Activate AiWriter', 'aiwriter')}
				</p>
				<RangeControl
					label={__('Creativity', 'aiwriter')}
					value={temperature}
					onChange={value => {
						setTemperature(value);
						updateUserMetaDebounced('temperature', value);
					}}
					min={0}
					max={1}
					step={.1}
					withInputField={false}
					renderTooltipContent={value => {
						if (value <= 0) {
							return __('Not creative at all', 'aiwriter')
						}

						if (value >= 0.8) {
							return __('Very creative', 'aiwriter')
						}

						if (value >= 0.5) {
							return __('Reasonably creative', 'aiwriter')
						}

						if (value < 0.5) {
							return __('Rather less creative', 'aiwriter')
						}
					}}
				/>
				<RangeControl
					label={__('Text length', 'aiwriter')}
					value={textLength}
					onChange={value => {
						setTextLength(value);
						updateUserMetaDebounced('textLength', value);
					}}
					min={200}
					max={1000}
					showTooltip={false}
					marks={[
						{
							value: 200,
							label: __('Little', 'aiwriter'),
						},
						{
							value: 400,
							label: __('Medium', 'aiwriter'),
						},
						{
							value: 600,
							label: __('Long', 'aiwriter'),
						},
						{
							value: 800,
							label: __('Very long', 'aiwriter'),
						},
						{
							value: 1000,
							label: __('Maximum', 'aiwriter'),
						},
					]}
					step={200}
					withInputField={false}
				/>
			</PanelBody>
			<PanelBody title={__('Your subscription', 'aiwriter')} initialOpen={false}
					   onToggle={getActivationCode}>
				<TextControl
					onChange={saveActivationCode}
					value={activationCode === 'ENCRYPTED' ? '' : activationCode}
					placeholder={
						isLoading
							? __('Loading code ...', 'aiwriter')
							: activationCode === 'ENCRYPTED' ? __('**encrypted**', 'aiwriter') : 'abcdefghijklmnopqrstuvwxyz='
					}
					label={__('Activation code', 'aiwriter')} key="activation-code"
				/>
				{activationCode === '' && !isLoading
					? <p><a href="https://aiwriter.space"
							target="_blank">{__('Don\'t have an activation code yet? Click here.', 'aiwriter')}</a>
					</p>
					: null}
				{
					// @todo add "manage subscription" link
				}
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
