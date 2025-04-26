import { createRoot } from 'react-dom/client'
import './index.css'
import Home from './pages/Home.tsx'

import { createBrowserRouter, RouterProvider } from 'react-router'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  }, 
  {
    path: '/home',
    element: <Home />,
  }
  // {
  //   path: '/npcs',
  //   element: <AllNPCS />,
  // },
  // {
  //   path: '/npcs/:id',
  //       element: <NPCView />
  // }
])


function Main() {
  return <RouterProvider router = {router} />
}

createRoot(document.getElementById('root')!).render(
  <Main />,
)
