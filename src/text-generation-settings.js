import debounce from 'lodash/debounce';
import {__} from '@wordpress/i18n';
import {RangeControl} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import {useState} from '@wordpress/element';
import {useDispatch} from '@wordpress/data';
import {store as noticesStore} from '@wordpress/notices';
import {
	PanelBody,
	FormToggle
} from '@wordpress/components';


export const TextGenerationSettings = () => {
	let {AiWriter} = window;
	const [isLoading, setLoading] = useState(false);
	const [isActive, setIsActive] = useState(AiWriter.isActive);
	const [temperature, setTemperature] = useState(AiWriter.temperature);
	const [textLength, setTextLength] = useState(AiWriter.textLength);
	const updateUserMetaDebounced = debounce(updateUserMeta, 2000);
	const {createErrorNotice} = useDispatch(noticesStore);


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
				max={2}
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
				label={__('Max. text length', 'aiwriter')}
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
	);
}
