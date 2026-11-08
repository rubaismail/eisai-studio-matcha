import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App from './App';
import AuthProvider from './auth/AuthProvider';
import './index.css';

// A data router is needed for useBlocker, which guards the add/edit form's
// unsaved changes. App still declares every page's route itself.
// AuthProvider is inside the router because logOut navigates.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <AuthProvider>
        <App />
      </AuthProvider>
    ),
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
