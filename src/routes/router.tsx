import { createBrowserRouter, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { LoginPage } from '@/pages/login/LoginPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/products" replace />,
          },
          {
            path: 'products',
            element: <ProductsPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/products" replace />,
  },
])
