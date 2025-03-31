import { Scope } from 'react-shadow-scope';

export const ServerComponent = () => {
	return (
		<Scope
			stylesheet={
				/*css*/ `
					:host {
						display: block;
						background-color: blue;
						color: white;
					}
				`
			}
		>
			<h1>Server Component Renders!</h1>
		</Scope>
	);
};
