import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "./providers";
import { AppRoutes } from "./routes";

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <AppRoutes />
      </Providers>
      <Analytics />
    </BrowserRouter>
  );
}
