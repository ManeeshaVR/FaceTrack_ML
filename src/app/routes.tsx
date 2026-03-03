import { createBrowserRouter, Navigate } from 'react-router';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Score from './pages/Score';
import Guidance from './pages/Guidance';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard/students" replace />
      },
      {
        path: 'students',
        element: <Students />
      },
      {
        path: 'attendance',
        element: <Attendance />
      },
      {
        path: 'score',
        element: <Score />
      },
      {
        path: 'guidance',
        element: <Guidance />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
