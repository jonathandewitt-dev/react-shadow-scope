import { css, Scope } from 'react-shadow-scope';

const styles = css`
	:host {
		display: block;
		background-color: blue;
		color: white;
	}
`;

export const ServerComponent = () => {
	return (
		<Scope stylesheet={styles}>
			<h1>Server Component Renders!</h1>
		</Scope>
	);
};
