import { Outlet } from "react-router-dom";
import Header from "./Header";
import BottomNav from "./BottomNav";

const AppLayout = () => {
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[448px] bg-background overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="px-6 pb-24 pt-6" role="main" tabIndex={-1}>
        <Outlet />
      </main>
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="a11y-announcer" />
      <BottomNav />
    </div>
  );
};

export default AppLayout;
