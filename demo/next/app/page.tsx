import { ShadowScopeConfigProvider } from '../../../dist';
import Demo from './demo';

export default function Home() {
	return (
		<ShadowScopeConfigProvider config={{ dsd: 'emulated' }}>
			<Demo />
		</ShadowScopeConfigProvider>
	);
}
