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
      <main className="main-content flex-grow w-full max-w-7xl mx-auto px-4 py-6" data-testid="main-content">
        <div className="content-container" data-testid="content-container">
          {children}
        </div>
      </main>
      <Footer />

      {/* NJ Sign - positioned off to the side */}
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-10 hidden lg:block">
        <img
          src="/NJsign.jpg"
          alt="NJ Sign"
          className="w-16 h-auto opacity-60 hover:opacity-80 transition-opacity duration-200"
        />
      </div>
    </div>
  );
};

export default Layout;