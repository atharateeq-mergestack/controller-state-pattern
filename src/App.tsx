import { TodoList } from "./features/todo/TodoList";
import { TodoStats } from "./features/todo/TodoStats";
import { StorageController } from "./store/StorageController";

function App() {
  const storageController = StorageController.getInstance();
  const { theme } = storageController.useStorage(['theme']);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-red-300' : 'bg-red-100'}`}>
      <div className={`py-4 sm:py-6 md:py-8`}>
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6 md:mb-8">
            <h1 className={`text-2xl sm:text-3xl font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              State Controller Pattern Demo
            </h1>
            <button
              onClick={() => storageController.toggleTheme()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <p className={`text-sm sm:text-base text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto px-2 sm:px-4`}>
            This demo showcases the State Controller pattern, where components can selectively subscribe to specific parts of the state.
            Notice how TodoList and TodoStats components independently update when their respective state changes.
          </p>
          <TodoList />
          <TodoStats />
        </div>
      </div>
    </div>
  );
}

export default App;
