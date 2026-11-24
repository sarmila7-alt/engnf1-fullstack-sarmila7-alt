import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireAuth } from './auth/guards.jsx';
import Layout from './components/Layout.jsx';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TriageQueuePage from './pages/TriageQueuePage.jsx';
import TicketDetailPage from './pages/TicketDetailPage.jsx';
import ResourcesPage from './pages/ResourcesPage.jsx';
import ResourceDetailPage from './pages/ResourceDetailPage.jsx';

function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">
        Page not found
      </h1>

      <p className="mt-2 text-slate-600">
        That page does not exist.
      </p>

      <Navigate to="/" replace />
    </div>
  );
}

export default function App() {
  return (
    <Routes>

      {/* Public routes */}
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>

          {/* Ticket management */}
          <Route index element={<TriageQueuePage />} />

          <Route
            path="tickets/:id"
            element={<TicketDetailPage />}
          />

          {/* Resource management */}
          <Route
            path="resources"
            element={<ResourcesPage />}
          />

          <Route
            path="resources/:id"
            element={<ResourceDetailPage />}
          />

          {/* Invalid routes */}
          <Route path="*" element={<NotFoundPage />} />

        </Route>
      </Route>

    </Routes>
  );
}