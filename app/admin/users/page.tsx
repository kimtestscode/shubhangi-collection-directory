import { Metadata } from 'next';
import UserManagementApp from '@/components/admin/UserManagementApp';

export const metadata: Metadata = {
  title: 'Users & Permissions | Shubhangi Collection Admin',
  description: 'Manage admin logins, roles, and feature access permissions.',
};

export default function AdminUsersPage() {
  return <UserManagementApp />;
}
