import { createRoot } from 'react-dom/client';
import { Demo } from './src/demo';

const App = () => <Demo />;
const root = createRoot(document.getElementById('App'));
root.render(<App />);
