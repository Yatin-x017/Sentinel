import { lazy } from 'react'

const LandingPage = lazy(() => import('../pages/LandingPage.jsx'))
const CheckEmailPage = lazy(() => import('../pages/CheckEmailPage.jsx'))
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage.jsx'))
const ScanProgressPage = lazy(() => import('../pages/ScanProgressPage.jsx'))
const ResultsPage = lazy(() => import('../pages/ResultsPage.jsx'))
const ActionPlanPage = lazy(() => import('../pages/ActionPlanPage.jsx'))
const PrivacyPage = lazy(() => import('../pages/PrivacyPage.jsx'))

export const routes = [
  { path: '/', element: <LandingPage /> },
  { path: '/check', element: <CheckEmailPage /> },
  { path: '/verify', element: <VerifyEmailPage /> },
  { path: '/scan/:scanId', element: <ScanProgressPage /> },
  { path: '/results/:scanId', element: <ResultsPage /> },
  { path: '/actions/:scanId', element: <ActionPlanPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
]
