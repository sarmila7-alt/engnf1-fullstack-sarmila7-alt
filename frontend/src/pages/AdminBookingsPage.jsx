import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireAuth } from './auth/guards.jsx';
import Layout from './components/Layout.jsx';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TriageQueuePage from './pages/TriageQueuePage.jsx';
import TicketDetailPage from './pages/TicketDetailPage.jsx';
import ResourcesPage from './pages/ResourcesPage.jsx';
import ResourceDetailPage from './pages/ResourceDetailPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import AdminResourcesPage from './pages/AdminResourcesPage.jsx';
import AdminBookingsPage from './pages/AdminBookingsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<TriageQueuePage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="resources/:id" element={<ResourceDetailPage />} />
          <Route path="bookings" element={<MyBookingsPage />} />

          <Route element={<RequireAuth role="ADMIN" />}>
            <Route path="admin/resources" element={<AdminResourcesPage />} />
            <Route path="admin/bookings" element={<AdminBookingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}