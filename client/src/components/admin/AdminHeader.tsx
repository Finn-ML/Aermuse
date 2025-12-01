import { useLocation, Link } from 'wouter';
import { Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '../../lib/auth';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard Overview',
  '/admin/users': 'User Management',
  '/admin/contracts': 'Contract Overview',
  '/admin/templates': 'Template Management',
  '/admin/subscriptions': 'Subscription Metrics',
  '/admin/analytics': 'Platform Analytics',
  '/admin/settings': 'System Settings',
  '/admin/activity': 'Activity Log',
};

interface AdminHeaderProps {
  pageTitle?: string;
}

export function AdminHeader({ pageTitle }: AdminHeaderProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Get page title from path or prop
  const getPageTitle = () => {
    if (pageTitle) return pageTitle;
    const path = location;
    // Check exact match first
    if (pageTitles[path]) return pageTitles[path];
    // Check prefix matches for nested routes
    for (const [route, title] of Object.entries(pageTitles)) {
      if (path.startsWith(route) && route !== '/admin') {
        return title;
      }
    }
    return 'Admin';
  };

  // Generate breadcrumbs
  const getBreadcrumbs = () => {
    const parts = location.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Admin', href: '/admin' }];

    if (parts.length > 1) {
      const section = parts[1];
      const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
      breadcrumbs.push({
        name: sectionName,
        href: `/admin/${section}`,
      });

      if (parts.length > 2) {
        breadcrumbs.push({
          name: parts[2] === 'new' ? 'New' : 'Details',
          href: location,
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="ml-12 lg:ml-0">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm text-gray-500 mb-1">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-4 w-4" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900">{crumb.name}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-gray-700">
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Page title */}
          <h1 className="text-xl font-semibold text-gray-900">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications (placeholder) */}
          <button className="p-2 text-gray-400 hover:text-gray-600 relative">
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 pl-4 border-l">
            <div className="w-8 h-8 bg-[#660033] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
