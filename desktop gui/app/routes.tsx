import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Chat } from "./pages/Chat";
import { ImageStudio } from "./pages/ImageStudio";
import { VideoStudio } from "./pages/VideoStudio";
import { Settings } from "./pages/Settings";
import { AdminAccounts } from "./pages/AdminAccounts";
import { LocalCache } from "./pages/LocalCache";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Chat },
      { path: "images", Component: ImageStudio },
      { path: "videos", Component: VideoStudio },
      { path: "settings", Component: Settings },
      { path: "admin", Component: AdminAccounts },
      { path: "cache", Component: LocalCache },
    ],
  },
]);
