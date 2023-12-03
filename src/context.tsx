import React from 'react'

export type ShadowScopeConfig = {
	dsd: 'on' | 'off' | 'emulated';
};

export const DEFAULT_SHADOW_SCOPE_CONTEXT: ShadowScopeConfig = {
	dsd: 'on',
};

export const ShadowScopeContext = React.createContext<ShadowScopeConfig>(DEFAULT_SHADOW_SCOPE_CONTEXT);

export type ShadowScopeConfigProviderProps = React.PropsWithChildren<{
	config: ShadowScopeConfig;
}>;

/**
 * Use this to set the global configuration for react-shadow-scope.
 *
 * @example
 * ```tsx
 * <ShadowScopeProvider config={{ dsd: 'emulated' }}>
 *   {children}
 * </ShadowScopeProvider>
 * ```
 */
export const ShadowScopeConfigProvider = ({ config, children }: ShadowScopeConfigProviderProps) => {
	return (
		<ShadowScopeContext.Provider value={config}>
			{children}
		</ShadowScopeContext.Provider>
	);
};
