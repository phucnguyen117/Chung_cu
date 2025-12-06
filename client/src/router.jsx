// src/router.jsx
import { createBrowserRouter, Outlet } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import ChatBot from './components/Chatbot.jsx'

// Public pages
import Rooms from './pages/Rooms.jsx'
import Houses from './pages/Houses.jsx'
import Apartments from './pages/Apartments.jsx'
import Dorms from './pages/Dorms.jsx'
import Reviews from './pages/Reviews.jsx'
import Blog from './pages/Blog.jsx'
// import Login from './pages/Login.jsx'
// import Register from './pages/Register.jsx'
import Homes from './pages/Homes.jsx'
import PostDetail from './pages/postDetail.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'



// Admin pages
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminPosts from './pages/admin/AdminPosts.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminReviews from './pages/admin/AdminReviews.jsx'
import AdminCategories from './pages/admin/AdminCategories.jsx'
import AdminAmenities from './pages/admin/AdminAmenities.jsx'
import AdminEnvironmentFeatures from './pages/admin/AdminEnvironmentFeatures.jsx'
import AdminLocations from './pages/admin/AdminLocations.jsx'
import AdminSavedPosts from './pages/admin/AdminSavedPosts.jsx'
import AdminPostCreate from './pages/admin/AdminPostCreate.jsx'
import AdminPostEdit from './pages/admin/AdminPostEdit.jsx'
import AdminBlogList from './pages/admin/AdminBlogList'
import AdminBlogCreate from './pages/admin/AdminBlogCreate'
// Layout cho trang người dùng (có Header + Footer)
function Layout() {
  return (
    <div className="app">
      <Header />
      <main className="container container--main">
        <Outlet />
      </main>
      <Footer />
      <ChatBot />
    </div>
  )
}

export const router = createBrowserRouter([
  // ========== NHÓM ROUTE PUBLIC ==========
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Homes /> },
      { path: '/phong-tro', element: <Rooms /> },
      { path: '/nha-nguyen-can', element: <Houses /> },
      { path: '/can-ho', element: <Apartments /> },
      { path: '/ky-tuc-xa', element: <Dorms /> },
      { path: '/reviews', element: <Reviews /> },  
      { path: '/blog', element: <Blog /> },

      // login/register nếu đang dùng popup thì sau bỏ cũng được
      // { path: '/login', element: <Login /> },
      // { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
      { path: '/post/:id', element: <PostDetail /> },
    ],
  },

  // ========== NHÓM ROUTE ADMIN (KHÔNG Header/Footer) ==========
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'posts', element: <AdminPosts /> },
      {path: 'posts/create', element: <AdminPostCreate/>},
       { path: 'posts/:id/edit', element: <AdminPostEdit /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'categories', element: <AdminCategories /> },
      { path: 'amenities', element: <AdminAmenities /> },
      {path: 'environment-features', element: <AdminEnvironmentFeatures />},
      { path: 'locations', element: <AdminLocations /> },
      { path: 'reviews', element: <AdminReviews /> },
      { path: 'saved-posts', element: <AdminSavedPosts /> },
      { path: 'blog-list', element: <AdminBlogList/> },
      { path: 'blog-list/create', element: <AdminBlogCreate/>
      }
    ],
  },
])
