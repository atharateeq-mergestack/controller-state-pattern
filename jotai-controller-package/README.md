# Jotai Controller

A powerful state management library built on top of Jotai with controller pattern for React applications. This library provides a clean, type-safe way to manage state using the controller pattern with automatic subscriptions and persistence support.

## Features

- 🎯 **Controller Pattern**: Clean separation of concerns with controller-based state management
- 🔄 **Automatic Subscriptions**: Auto-subscribe to state changes with methods starting with 'on'
- 💾 **Persistent Storage**: Built-in localStorage support with `StorageController`
- 🎨 **TypeScript Support**: Full TypeScript support with excellent type inference
- ⚡ **Jotai Integration**: Built on top of Jotai for optimal performance
- 🔧 **Flexible API**: Use hooks, direct state access, or subscription patterns
- 🧹 **Auto Cleanup**: Automatic cleanup of subscriptions and listeners

## Installation

```bash
npm install jotai-controller
# or
yarn add jotai-controller
# or
pnpm add jotai-controller
```

## Setup

### Provider Setup

Wrap your application with the `JotaiProvider` to enable state management:

```typescript
import { JotaiProvider } from 'jotai-controller';

// In your main.tsx or App.tsx
function App() {
  return (
    <JotaiProvider>
      <YourApp />
    </JotaiProvider>
  );
}
```

### Store Usage

The package handles store management internally. You can optionally provide your own store instance:

```typescript
import { StateController } from 'jotai-controller';
import { createStore } from 'jotai';

// Option 1: Use the default store (recommended)
const controller = new StateController('myState', initialState);

// Option 2: Use a custom store
const customStore = createStore();
const controller = new StateController('myState', initialState, customStore);
```

## Quick Start

### Basic StateController Usage

```typescript
import { StateController } from 'jotai-controller';

// Define your state interface
interface UserState {
  name: string;
  email: string;
  isLoggedIn: boolean;
}

// Create a controller
class UserController extends StateController<UserState> {
  constructor() {
    super('user', {
      name: '',
      email: '',
      isLoggedIn: false
    });
    
    // Auto-subscribe to state changes
    this.autoSubscribeOnMethods(this);
  }

  // Methods starting with 'on' are automatically subscribed
  onUserLogin() {
    return this.subscribe('isLoggedIn', (newValue, oldValue) => {
      if (newValue) {
        console.log('User logged in!');
      }
    });
  }

  // Regular methods for state manipulation
  login(name: string, email: string) {
    this.setState({
      name,
      email,
      isLoggedIn: true
    });
  }

  logout() {
    this.setState({
      name: '',
      email: '',
      isLoggedIn: false
    });
  }
}

// Use in your React component
function UserProfile() {
  const userController = new UserController();
  
  // Use hooks to get state
  const { name, email, isLoggedIn } = userController.useState(['name', 'email', 'isLoggedIn']);
  
  return (
    <div>
      {isLoggedIn ? (
        <div>
          <h1>Welcome, {name}!</h1>
          <p>Email: {email}</p>
          <button onClick={() => userController.logout()}>Logout</button>
        </div>
      ) : (
        <button onClick={() => userController.login('John Doe', 'john@example.com')}>
          Login
        </button>
      )}
    </div>
  );
}

// Complete example with Provider
import { JotaiProvider } from 'jotai-controller';

function App() {
  return (
    <JotaiProvider>
      <UserProfile />
    </JotaiProvider>
  );
}
```

### Persistent Storage with StorageController

```typescript
import { StorageController } from 'jotai-controller';

interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

class SettingsController extends StorageController<SettingsState> {
  constructor() {
    super({
      theme: 'light',
      language: 'en',
      notifications: true
    });
  }

  toggleTheme() {
    const currentTheme = this.getValue('theme');
    this.setState({
      theme: currentTheme === 'light' ? 'dark' : 'light'
    });
  }

  toggleNotifications() {
    this.toggle('notifications'); // Built-in toggle method for booleans
  }
}

// Use in component
function SettingsPanel() {
  const settingsController = new SettingsController();
  const { theme, language, notifications } = settingsController.useState(['theme', 'language', 'notifications']);
  
  return (
    <div className={`settings ${theme}`}>
      <h2>Settings</h2>
      <button onClick={() => settingsController.toggleTheme()}>
        Switch to {theme === 'light' ? 'dark' : 'light'} theme
      </button>
      <label>
        <input
          type="checkbox"
          checked={notifications}
          onChange={() => settingsController.toggleNotifications()}
        />
        Enable notifications
      </label>
    </div>
  );
}
```

## API Reference

### JotaiProvider

The provider component that wraps your application to enable Jotai state management.

#### Props
```typescript
interface JotaiProviderProps {
  children: ReactNode;
  customStore?: ReturnType<typeof createStore>;
  devTools?: ReactNode;
}
```

#### Usage
```typescript
import { JotaiProvider } from 'jotai-controller';
import { DevTools } from 'jotai-devtools'; // Optional
import 'jotai-devtools/styles.css'; // Required if we need to have devtool

function App() {
  return (
    <JotaiProvider devTools={<DevTools />}>
      <YourComponents />
    </JotaiProvider>
  );
}
```

### StateController

The base controller class for managing state without persistence.

#### Constructor
```typescript
constructor(name: string, initialState: T, customStore?: ReturnType<typeof createStore>)
```

#### Methods

- `useState(keys: (keyof T)[]): Partial<T>` - React hook to get multiple state values
- `useScopeState(key: keyof T): () => [T[K], (value: T[K]) => void]` - React hook for a single state value
- `setState(newState: Partial<T>): void` - Set state values (replaces current state)
- `updateState(newState: Partial<T>): void` - Update state values (merges with current state)
- `getValue<K extends keyof T>(key: K): T[K]` - Get a single state value
- `getValues(keys: (keyof T)[]): Partial<T>` - Get multiple state values
- `resetState(key: keyof T): void` - Reset a single state to initial value
- `resetStates(keys: (keyof T)[]): void` - Reset multiple states to initial values
- `resetAll(): void` - Reset all states to initial values
- `subscribe<K extends keyof T>(key: K, listener: StateChangeListener<T, K>): () => void` - Subscribe to state changes
- `subscribeToKeys(keys: (keyof T)[], listener: (changedKeys: Partial<T>, allKeys: Partial<T>) => void): () => void` - Subscribe to multiple state changes
- `clearAllListeners(): void` - Clear all active listeners
- `autoSubscribeOnMethods(instance: object): void` - Auto-subscribe to methods starting with 'on'
- `unsubscribeAll(): void` - Unsubscribe from all auto-subscribed methods

### StorageController

Extends StateController with localStorage persistence.

#### Constructor
```typescript
constructor(initialState: T, prefix?: string, customStore?: ReturnType<typeof createStore>)
```

#### Additional Methods

- `getAllValues(): T` - Get all current state values
- `toggle<K extends keyof T>(key: K): void` - Toggle boolean values

## Advanced Usage

### Custom Store Integration

```typescript
import { createStore } from 'jotai';
import { StateController, StorageController } from 'jotai-controller';

// Create a custom store
const customStore = createStore();

// Use with controllers
const userController = new StateController('user', initialState, customStore);
const settingsController = new StorageController(settingsState, "", customStore);
```

### Manual Subscription Management

```typescript
class TodoController extends StateController<TodoState> {
  constructor() {
    super('todos', { items: [], filter: 'all' });
  }

  onTodoAdded() {
    return this.subscribe('items', (newItems, oldItems) => {
      if (newItems.length > oldItems.length) {
        console.log('New todo added!');
      }
    });
  }

  onFilterChanged() {
    return this.subscribe('filter', (newFilter) => {
      console.log(`Filter changed to: ${newFilter}`);
    });
  }

  // Manual cleanup
  cleanup() {
    this.unsubscribeAll();
  }
}
```

## TypeScript Support

The library is written in TypeScript and provides excellent type safety:

```typescript
interface AppState {
  user: User | null;
  settings: Settings;
  todos: Todo[];
}

class AppController extends StateController<AppState> {
  constructor() {
    super('app', {
      user: null,
      settings: { theme: 'light' },
      todos: []
    });
  }

  // TypeScript will infer the correct types
  getUser() {
    return this.getValue('user'); // Returns User | null
  }

  updateUser(user: User) {
    this.setState({ user }); // TypeScript ensures user is of type User
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

