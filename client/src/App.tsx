import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import ContractView from "@/pages/ContractView";
import Terms from "@/pages/Terms";
import Pricing from "@/pages/Pricing";
import Checkout from "@/pages/Checkout";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import ArtistPage from "@/pages/ArtistPage";
// Admin pages
import {
  AdminOverview,
  AdminUsers,
  AdminContracts,
  AdminTemplates,
  AdminSubscriptions,
  AdminAnalytics,
  AdminSettings,
  AdminActivity,
} from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/contracts/:id" component={ContractView} />
      <Route path="/terms" component={Terms} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      {/* Admin routes */}
      <Route path="/admin" component={AdminOverview} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/users/:id" component={AdminUsers} />
      <Route path="/admin/contracts" component={AdminContracts} />
      <Route path="/admin/contracts/:id" component={AdminContracts} />
      <Route path="/admin/templates" component={AdminTemplates} />
      <Route path="/admin/templates/new" component={AdminTemplates} />
      <Route path="/admin/templates/:id" component={AdminTemplates} />
      <Route path="/admin/subscriptions" component={AdminSubscriptions} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/activity" component={AdminActivity} />
      {/* Public artist landing pages */}
      <Route path="/artist/:slug" component={ArtistPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
