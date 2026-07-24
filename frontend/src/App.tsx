import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { DashboardProvider } from './contexts/DashboardContext'
import { Toaster } from 'react-hot-toast'
import RouteLoader from './components/common/RouteLoader'

// Layout & Authentication Pages
const Splash = lazy(() => import('./pages/Splash'))
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Dashboard Inner Pages
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'))
const LiveDetection = lazy(() => import('./pages/dashboard/LiveDetection'))
const UploadVideo = lazy(() => import('./pages/dashboard/UploadVideo'))
const DetectionResults = lazy(() => import('./pages/dashboard/DetectionResults'))
const History = lazy(() => import('./pages/dashboard/History'))
const Analytics = lazy(() => import('./pages/dashboard/Analytics'))
const Notifications = lazy(() => import('./pages/dashboard/Notifications'))
const Settings = lazy(() => import('./pages/dashboard/Settings'))
const Profile = lazy(() => import('./pages/dashboard/Profile'))
const HelpSupport = lazy(() => import('./pages/dashboard/HelpSupport'))

import { useLocation } from './hooks/useLocation'

function App() {
  useLocation();

  return (
    <ThemeProvider>
      <DashboardProvider>
        <AuthProvider>
          {/* Global styled notifications toaster */}
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#f3f4f6',
                fontSize: '13px',
                borderRadius: '12px',
                fontWeight: '600',
                letterSpacing: '0.3px'
              },
              duration: 3500,
            }}
          />
          
          <BrowserRouter>
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                {/* Public/Auth Routes */}
                <Route path="/" element={<Splash />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                {/* Guarded Dashboard Routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="live-detection" element={<LiveDetection />} />
                  <Route path="upload-video" element={<UploadVideo />} />
                  <Route path="detection-results" element={<DetectionResults />} />
                  <Route path="history" element={<History />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="help-support" element={<HelpSupport />} />
                </Route>

                {/* Wildcard Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </DashboardProvider>
    </ThemeProvider>
  )
}

export default App
