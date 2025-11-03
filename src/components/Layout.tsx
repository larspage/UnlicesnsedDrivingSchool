import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="layout-wrapper min-h-screen flex flex-col relative" data-testid="layout-wrapper">
      <Header />
      <main className="main-content flex-grow w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6" data-testid="main-content">
        <div className="content-container" data-testid="content-container">
          {children}
        </div>
      </main>
      <div className="flex-grow"></div>
      <Footer />
    </div>
  );
};

export default Layout;