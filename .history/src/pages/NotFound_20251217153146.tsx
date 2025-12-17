// src/pages/NotFound.tsx
import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Log only in development to avoid noisy production console
    if (import.meta.env.DEV) {
      console.warn(
        "404: attempted to access non-existent route:",
        location.pathname
      );
    }

    // Optional: update document title for this page
    const prevTitle = document.title;
    document.title = "404 – Page not found | Tradeville";
    return () => {
      document.title = prevTitle;
    };
  }, [location.pathname]);

  const handleBack = () => {
    // If there is history, go back, otherwise go home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05060b] text-foreground">
      <div className="px-4 text-center space-y-4 max-w-md">
        <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground">
          Error 404
        </p>

        <h1 className="text-3xl md:text-4xl font-bold">
          Page not found
        </h1>

        <p className="text-sm md:text-base text-muted-foreground">
          We couldn&apos;t find{" "}
          <span className="font-mono break-all text-foreground/80">
            {location.pathname}
          </span>
          . It may have been moved, renamed, or no longer exists.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleBack}
            className="justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>

          <Button asChild className="justify-center">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;