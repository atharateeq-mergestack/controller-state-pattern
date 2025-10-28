# Storage Controller Usage

The `StorageController` class provides a persistent state management solution using various storage backends.

## Storage Backends

### 1. **localStorage** (Default)
Persists data across browser sessions.

```typescript
import { StorageController } from './StorageController';

const controller = new StorageController({
    theme: 'light',
    language: 'en',
}, {
    storageType: 'localStorage'
});
```

### 2. **sessionStorage**
Persists data only for the current browser session.

```typescript
const controller = new StorageController({
    theme: 'light',
    language: 'en',
}, {
    storageType: 'sessionStorage'
});
```

### 3. **Cookies** 🍪
Perfect for SSR/Next.js scenarios where server needs access to values.

```typescript
import { StorageController } from './StorageController';
import Cookies from 'js-cookie';

const controller = new StorageController({
    theme: 'light',
    language: 'en',
}, {
    storageType: 'cookie',
    prefix: 'app_', // Optional prefix for cookie names
    cookieOptions: {
        expires: 7,        // Cookie expires in 7 days
        secure: true,      // Only send over HTTPS
        sameSite: 'strict', // CSRF protection
        path: '/',
    }
});
```

## Complete Example

### Using localStorage
```typescript
// appStroageController.ts
import { StorageController } from './StorageController';

interface AppStorage {
    theme: 'light' | 'dark';
    language: 'en' | 'fr';
}

export class AppStorageController extends StorageController<AppStorage> {
    constructor() {
        super({
            theme: 'light',
            language: 'en',
        }, {
            storageType: 'localStorage'
        });
    }

    toggleTheme() {
        const theme = this.getValue('theme');
        this.setState({ theme: theme === 'light' ? 'dark' : 'light' });
    }
}

export const appStorage = new AppStorageController();
```

### Using Cookies (for SSR/Next.js)
```typescript
// appCookieStorageController.ts
import { StorageController } from './StorageController';

export class AppCookieStorageController extends StorageController<AppCookieStorage> {
    constructor() {
        super({
            theme: 'light',
            language: 'en',
        }, {
            storageType: 'cookie',
            prefix: 'app_',
            cookieOptions: {
                expires: 7,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            }
        });
    }

    toggleTheme() {
        const theme = this.getValue('theme');
        this.setState({ theme: theme === 'light' ? 'dark' : 'light' });
    }
}

export const appCookieStorage = new AppCookieStorageController();
```

### Usage in Components
```tsx
import { appStorage } from './store/appStroageController';

function ThemeToggle() {
    const { theme } = appStorage.useState(['theme']);
    
    return (
        <button onClick={() => appStorage.toggleTheme()}>
            Current theme: {theme}
        </button>
    );
}
```

## API Reference

### Constructor Options
- `initialState`: Initial state values (required)
- `options`: 
  - `prefix?`: Prefix for storage keys (optional)
  - `storageType?`: 'localStorage' | 'sessionStorage' | 'cookie' (default: 'localStorage')
  - `cookieOptions?`: Cookie attributes when using cookie storage (optional)

### Methods
All methods work the same regardless of storage backend:
- `useState(keys)` - React hook to subscribe to state
- `getValue(key)` - Get single value
- `getValues(keys)` - Get multiple values
- `getAllValues()` - Get all values
- `setState(newState)` - Set state (replaces)
- `updateState(newState)` - Update state (merges)
- `resetState(key)` - Reset single key
- `resetStates(keys)` - Reset multiple keys
- `resetAll()` - Reset all keys
- `subscribe(key, listener)` - Subscribe to changes
- `clearAllListeners()` - Clear all listeners
- `toggle(key)` - Toggle boolean value

## Why Use Cookies?

Cookies are particularly useful for:
- **Server-Side Rendering (SSR)**: Server can read cookie values before rendering
- **Authentication states**: Sensitive session data
- **Cross-tab synchronization**: Automatic (unlike localStorage)
- **Cross-domain sharing**: With proper CORS setup

## References

Based on the Jotai GitHub issue: https://github.com/pmndrs/jotai/issues/1152

