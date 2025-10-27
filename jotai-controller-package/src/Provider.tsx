import { createStore } from 'jotai';
import { DevTools } from 'jotai-devtools';
import { Provider } from 'jotai/react';
import { ReactNode } from 'react';

// Create a singleton store instance
// eslint-disable-next-line react-refresh/only-export-components
export const store = createStore();

// Create a provider component
interface JotaiProviderProps {
    children: ReactNode;
    /**
     * Optional custom store instance.
     * If not provided, the default singleton store will be used.
     */
    customStore?: typeof store;
    /**
     * Optional DevTools component to render (from jotai-devtools)
     */
    showDevTools?: boolean;
}

export const JotaiProvider = ({ children, customStore, showDevTools }: JotaiProviderProps) => {
    return (
        <Provider store={customStore || store}>
            {showDevTools && <DevTools />}
            {children}
        </Provider>
    );
};

