import { createRoot } from 'react-dom/client';
import { Demo } from './src/demo';
import * as reactShadowScope from 'react-shadow-scope'

const App = () => <Demo reactShadowScope={reactShadowScope}/>;
const root = createRoot(document.getElementById('App'));
root.render(<App />);
