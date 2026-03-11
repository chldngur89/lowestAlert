import { createBrowserRouter } from 'react-router';
import { Onboarding } from './components/onboarding';
import { Home } from './components/home';
import { AddProduct } from './components/add-product';
import { ProductDetail } from './components/product-detail';
import { Alerts } from './components/alerts';
import { Settings } from './components/settings';
import { Layout } from './components/layout';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Onboarding,
  },
  {
    Component: Layout,
    children: [
      {
        path: '/home',
        Component: Home,
      },
      {
        path: '/add',
        Component: AddProduct,
      },
      {
        path: '/product/:id',
        Component: ProductDetail,
      },
      {
        path: '/alerts',
        Component: Alerts,
      },
      {
        path: '/settings',
        Component: Settings,
      },
    ],
  },
]);