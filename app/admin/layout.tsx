// app/admin/layout.tsx
import { Inter } from 'next/font/google';
import { Sidebar } from '../components/admin/sidebar';
import { Header } from '../components/admin/header';

const inter = Inter({ subsets: ['latin'] });

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-gray-50`}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 bg-white shadow-sm lg:block">
          <Sidebar />
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}