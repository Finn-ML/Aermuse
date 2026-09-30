import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";
import { CartProvider } from "./lib/cart";
import { ScrollToTop } from "@/components/ScrollToTop";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import ContractView from "@/pages/ContractView";
import Contracts from "@/pages/Contracts";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Pricing from "@/pages/Pricing";
import Checkout from "@/pages/Checkout";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import ArtistPage from "@/pages/ArtistPage";
import MyPurchases from "@/pages/MyPurchases";
import SplitVerificationPage from "@/pages/SplitVerificationPage";
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
import { AdminRoute } from "./components/AdminRoute";

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/contracts/:id" component={ContractView} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      {/* Buyer purchases history */}
      <Route path="/my-purchases" component={MyPurchases} />
      {/* Split verification for collaborators */}
      <Route path="/verify-split/:token" component={SplitVerificationPage} />
      {/* Admin routes — wrapped in AdminRoute guard */}
      <Route path="/admin">{() => <AdminRoute><AdminOverview /></AdminRoute>}</Route>
      <Route path="/admin/users">{() => <AdminRoute><AdminUsers /></AdminRoute>}</Route>
      <Route path="/admin/users/:id">{(params) => <AdminRoute><AdminUsers {...params} /></AdminRoute>}</Route>
      <Route path="/admin/contracts">{() => <AdminRoute><AdminContracts /></AdminRoute>}</Route>
      <Route path="/admin/contracts/:id">{(params) => <AdminRoute><AdminContracts {...params} /></AdminRoute>}</Route>
      <Route path="/admin/templates">{() => <AdminRoute><AdminTemplates /></AdminRoute>}</Route>
      <Route path="/admin/templates/new">{() => <AdminRoute><AdminTemplates /></AdminRoute>}</Route>
      <Route path="/admin/templates/:id">{(params) => <AdminRoute><AdminTemplates {...params} /></AdminRoute>}</Route>
      <Route path="/admin/subscriptions">{() => <AdminRoute><AdminSubscriptions /></AdminRoute>}</Route>
      <Route path="/admin/analytics">{() => <AdminRoute><AdminAnalytics /></AdminRoute>}</Route>
      <Route path="/admin/settings">{() => <AdminRoute><AdminSettings /></AdminRoute>}</Route>
      <Route path="/admin/activity">{() => <AdminRoute><AdminActivity /></AdminRoute>}</Route>
      {/* Public artist landing pages */}
      <Route path="/artist/:slug" component={ArtistPage} />
      <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Router />
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
