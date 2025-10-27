import React from 'react';
import { StateController, StateObject, StorageController } from '../src';

// Example 1: Basic StateController
interface UserState {
  name: string;
  email: string;
  isLoggedIn: boolean;
  profile: {
    avatar: string;
    bio: string;
  };
}

class UserController extends StateController<UserState & StateObject> {
  constructor() {
    super('user', {
      name: '',
      email: '',
      isLoggedIn: false,
      profile: {
        avatar: '',
        bio: ''
      }
    });

    // Auto-subscribe to state changes
    this.autoSubscribeOnMethods(this);
  }

  // Methods starting with 'on' are automatically subscribed
  onUserLogin() {
    return this.subscribe('isLoggedIn', (newValue) => {
      if (newValue) {
        console.log('User logged in!');
        // You can trigger side effects here
      }
    });
  }

  onProfileUpdate() {
    return this.subscribe('profile', (newProfile) => {
      console.log('Profile updated:', newProfile);
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
      isLoggedIn: false,
      profile: {
        avatar: '',
        bio: ''
      }
    });
  }

  updateProfile(avatar: string, bio: string) {
    this.updateState({
      profile: {
        avatar,
        bio
      }
    });
  }
}

// Example 2: StorageController with persistence
interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  fontSize: number;
}

class SettingsController extends StorageController<SettingsState & StateObject> {
  constructor() {
    super({
      theme: 'light',
      language: 'en',
      notifications: true,
      fontSize: 14
    }); // Prefix for localStorage keys
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

  updateFontSize(size: number) {
    this.setState({ fontSize: size });
  }

  changeLanguage(lang: string) {
    this.setState({ language: lang });
  }
}

// Example 3: Todo Controller with complex state
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoState {
  items: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  searchQuery: string;
}

class TodoController extends StateController<TodoState & StateObject> {
  constructor() {
    super('todos', {
      items: [],
      filter: 'all',
      searchQuery: ''
    });

    this.autoSubscribeOnMethods(this);
  }

  onTodoAdded() {
    return this.subscribe('items', (newItems, oldItems) => {
      if (oldItems)
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

  addTodo(text: string) {
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date()
    };

    this.updateState({
      items: [...this.getValue('items'), newTodo]
    });
  }

  toggleTodo(id: string) {
    const items = this.getValue('items');
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );

    this.setState({ items: updatedItems });
  }

  deleteTodo(id: string) {
    const items = this.getValue('items');
    const updatedItems = items.filter(item => item.id !== id);

    this.setState({ items: updatedItems });
  }

  setFilter(filter: 'all' | 'active' | 'completed') {
    this.setState({ filter });
  }

  setSearchQuery(query: string) {
    this.setState({ searchQuery: query });
  }

  getFilteredTodos(): TodoItem[] {
    const { items, filter, searchQuery } = this.getValues(['items', 'filter', 'searchQuery']);

    let filtered = items;

    // Apply search filter
    if (searchQuery && filtered) {
      filtered = filtered.filter(item =>
        item.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filtered)
      // Apply status filter
      switch (filter) {
        case 'active':
          filtered = filtered.filter(item => !item.completed);
          break;
        case 'completed':
          filtered = filtered.filter(item => item.completed);
          break;
      }

    return filtered || [];
  }

  clearCompleted() {
    const items = this.getValue('items');
    const activeItems = items.filter(item => !item.completed);
    this.setState({ items: activeItems });
  }
}

// Example React Components
export function UserProfile() {
  const userController = new UserController();
  const { name, email, isLoggedIn, profile } = userController.useState(['name', 'email', 'isLoggedIn', 'profile']);

  return (
    <div>
      {isLoggedIn && profile ? (
        <div>
          <h1>Welcome, {name}!</h1>
          <p>Email: {email}</p>
          <div>
            <h3>Profile</h3>
            <p>Avatar: {profile.avatar || 'No avatar'}</p>
            <p>Bio: {profile.bio || 'No bio'}</p>
            <button onClick={() => userController.updateProfile('avatar.jpg', 'Updated bio')}>
              Update Profile
            </button>
          </div>
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

export function SettingsPanel() {
  const settingsController = new SettingsController();
  const { theme, language, notifications, fontSize } = settingsController.useState(['theme', 'language', 'notifications', 'fontSize']);

  return (
    <div className={`settings ${theme}`}>
      <h2>Settings</h2>

      <div>
        <label>Theme:</label>
        <button onClick={() => settingsController.toggleTheme()}>
          Switch to {theme === 'light' ? 'dark' : 'light'} theme
        </button>
      </div>

      <div>
        <label>Language:</label>
        <select
          value={language}
          onChange={(e) => settingsController.changeLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={notifications}
            onChange={() => settingsController.toggleNotifications()}
          />
          Enable notifications
        </label>
      </div>

      <div>
        <label>Font Size: {fontSize}px</label>
        <input
          type="range"
          min="12"
          max="24"
          value={fontSize}
          onChange={(e) => settingsController.updateFontSize(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

export function TodoApp() {
  const todoController = new TodoController();
  const { filter, searchQuery } = todoController.useState(['filter', 'searchQuery']);
  const [newTodoText, setNewTodoText] = React.useState('');

  const filteredTodos = todoController.getFilteredTodos();

  return (
    <div>
      <h2>Todo App</h2>

      <div>
        <input
          type="text"
          placeholder="Add new todo..."
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && newTodoText.trim()) {
              todoController.addTodo(newTodoText.trim());
              setNewTodoText('');
            }
          }}
        />
        <button
          onClick={() => {
            if (newTodoText.trim()) {
              todoController.addTodo(newTodoText.trim());
              setNewTodoText('');
            }
          }}
        >
          Add Todo
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Search todos..."
          value={searchQuery}
          onChange={(e) => todoController.setSearchQuery(e.target.value)}
        />
      </div>

      <div>
        <button
          onClick={() => todoController.setFilter('all')}
          className={filter === 'all' ? 'active' : ''}
        >
          All
        </button>
        <button
          onClick={() => todoController.setFilter('active')}
          className={filter === 'active' ? 'active' : ''}
        >
          Active
        </button>
        <button
          onClick={() => todoController.setFilter('completed')}
          className={filter === 'completed' ? 'active' : ''}
        >
          Completed
        </button>
      </div>

      <ul>
        {filteredTodos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => todoController.toggleTodo(todo.id)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.text}
            </span>
            <button onClick={() => todoController.deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <button onClick={() => todoController.clearCompleted()}>
        Clear Completed
      </button>
    </div>
  );
}

