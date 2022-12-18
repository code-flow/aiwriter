import {__} from '@wordpress/i18n';
import {useState} from '@wordpress/element';
import {
	PluginSidebar,
	PluginSidebarMoreMenuItem
} from '@wordpress/edit-post';
import {
	PanelBody,
	TextControl,
	FormToggle
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import {AiWriterIcon} from "./icons";
import {useCallback} from "react";
import debounce from 'lodash/debounce';
import {RangeControl} from '@wordpress/components';
// import {Spinner} from '@wordpress/components';

const AiWriterSidebar = () => {
	const [isAiOn, setAiOn] = useState(window.AiWriter.isOn);
	const [activationCode, setActivationCode] = useState('');
	const [isLoading, setLoading] = useState(false);
	const [temperature, setTemperature] = useState(window.AiWriter.temperature);
	const [maxTokens, setMaxTokens] = useState(window.AiWriter.maxTokens);

	const saveActionCodeDebounced = useCallback(debounce(handleSaveActionCodeDebounced, 1000), []);

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
			console.error(error);
			setLoading(false);
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
			console.error(error);
			setLoading(false);
		});
	}

	return (<>
			<PluginSidebarMoreMenuItem
				target="aiwriter-sidebar" icon={AiWriterIcon()}>
				{__('AiWriter settings', 'aiwriter')}
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="aiwriter-sidebar"
				title={__('AiWriter settings', 'aiwriter')} icon={AiWriterIcon()}>
				<PanelBody title={__('Text generation settings', 'aiwriter')}>
					<p>
						<FormToggle
							checked={isAiOn}
							onChange={() => {
								setAiOn(state => !state);
								window.AiWriter.isOn = !isAiOn;
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
							window.AiWriter.temperature = value;
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
						value={maxTokens}
						onChange={value => {
							setMaxTokens(value);
							window.AiWriter.maxTokens = value;
						}}
						min={1}
						max={4096}
						step={1}
						withInputField={false}
						help={__('The maximum number of tokens to generate.', 'aiwriter')}
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
				</PanelBody>
			</PluginSidebar>
		</>
	)
}

export default AiWriterSidebar;
