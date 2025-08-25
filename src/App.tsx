import { Navigate, Route, Router, RouteSectionProps } from "@solidjs/router";
import { EditRepoPage } from "./pages/EditRepoPage";
import { SwitchRepoPage } from "./pages/SwitchRepoPage";

import "@/lib/app-views/editable-outline/style.css";
import "@/lib/tiptap/prosemirror.css";
import "./app.css";
import { Toaster } from "./components/ui/toast";
import { ThemeUpdater } from "./components/ThemeUpdater";
import { SpacingUpdater } from "./components/SpacingUpdater";
import { CustomCssInjector } from "./components/CustomCssInjector";

const RouterRoot = (props: RouteSectionProps) => {
  return (
    <>
      {props.children}
      <ThemeUpdater />
      <SpacingUpdater />
      <CustomCssInjector />
      <Toaster />
    </>
  );
};

const App = () => {
  return (
    <Router root={RouterRoot}>
      <Route path="/" component={() => <Navigate href="/switch-repo" />} />
      <Route path="/switch-repo" component={SwitchRepoPage} />
      <Route path="/edit/:repoId" component={EditRepoPage} />
    </Router>
  );
};

export default App;
