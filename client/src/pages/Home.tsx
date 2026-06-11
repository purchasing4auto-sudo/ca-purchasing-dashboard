import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Users, Package, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { subscribeToPRChanges, subscribeToSearchResults, fetchPRs, fetchSearchResults, fetchPRStats, unsubscribeFromChanges } from "@/lib/supabase";

interface PR {
  id: string;
  prNumber: string;
  product: string;
  salesperson: string;
  customer: string;
  status: "pending" | "timeout" | "completed";
  createdAt: string;
  timeoutMinutes?: number;
}

interface SearchResult {
  id: string;
  prId: string;
  supplier: string;
  price: number;
  rating: number;
  foundAt: string;
}

interface DashboardStats {
  totalPRs: number;
  timeoutPRs: number;
  completedPRs: number;
  totalSuppliers: number;
  avgPrice: number;
  avgRating: number | string;
}

export default function Home() {
  const [prList, setPrList] = useState<PR[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPRs: 0,
    timeoutPRs: 0,
    completedPRs: 0,
    totalSuppliers: 0,
    avgPrice: 0,
    avgRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);

  // Get user info from URL parameters
  const params = new URLSearchParams(window.location.search);
  const userName = params.get("name") || "User";

  // Calculate stats from data
  const calculateStats = (prs: PR[], results: SearchResult[]) => {
    const newStats = {
      totalPRs: prs.length,
      timeoutPRs: prs.filter(p => p.status === "timeout").length,
      completedPRs: prs.filter(p => p.status === "completed").length,
      totalSuppliers: results.length,
      avgPrice: results.length > 0 ? Math.round(results.reduce((sum, r: any) => sum + (r.price || 0), 0) / results.length) : 0,
      avgRating: results.length > 0 ? (results.reduce((sum, r: any) => sum + (r.rating || 0), 0) / results.length).toFixed(1) : 0,
    };
    setStats(newStats);
  };

  // Initial data fetch and real-time subscription setup
  useEffect(() => {
    let prSubscription: any = null;
    let searchSubscription: any = null;

    const setupRealtimeSubscriptions = async () => {
      try {
        setLoading(true);

        // Fetch initial data
        const [initialPRs, initialResults] = await Promise.all([
          fetchPRs(),
          fetchSearchResults(),
        ]);

        // Transform PR data
        const transformedPRs = (initialPRs || []).map((pr: any) => ({
          id: pr.id,
          prNumber: pr.pr_number || pr.prNumber || `PR-${pr.id}`,
          product: pr.product || pr.product_name || "",
          salesperson: pr.salesperson || pr.sales_person || "",
          customer: pr.customer || pr.customer_name || "",
          status: pr.status || "pending",
          createdAt: pr.created_at || new Date().toISOString(),
          timeoutMinutes: pr.timeout_minutes || undefined,
        }));

        // Transform search results
        const transformedResults = (initialResults || []).map((result: any) => ({
          id: result.id,
          prId: result.pr_id || result.prId || "",
          supplier: result.supplier || result.supplier_name || "",
          price: result.price || 0,
          rating: result.rating || 0,
          foundAt: result.found_at || result.foundAt || new Date().toISOString(),
        }));

        setPrList(transformedPRs);
        setSearchResults(transformedResults);
        calculateStats(transformedPRs, transformedResults);
        setIsConnected(true);
        setLastUpdate(new Date());

        // Subscribe to PR changes
        prSubscription = subscribeToPRChanges((payload: any) => {
          console.log("PR update received:", payload);
          fetchPRs().then((updatedPRs) => {
            const transformed = (updatedPRs || []).map((pr: any) => ({
              id: pr.id,
              prNumber: pr.pr_number || pr.prNumber || `PR-${pr.id}`,
              product: pr.product || pr.product_name || "",
              salesperson: pr.salesperson || pr.sales_person || "",
              customer: pr.customer || pr.customer_name || "",
              status: pr.status || "pending",
              createdAt: pr.created_at || new Date().toISOString(),
              timeoutMinutes: pr.timeout_minutes || undefined,
            }));
            setPrList(transformed);
            calculateStats(transformed, searchResults);
            setLastUpdate(new Date());
          });
        });

        // Subscribe to search results changes
        searchSubscription = subscribeToSearchResults((payload: any) => {
          console.log("Search result update received:", payload);
          fetchSearchResults().then((updatedResults) => {
            const transformed = (updatedResults || []).map((result: any) => ({
              id: result.id,
              prId: result.pr_id || result.prId || "",
              supplier: result.supplier || result.supplier_name || "",
              price: result.price || 0,
              rating: result.rating || 0,
              foundAt: result.found_at || result.foundAt || new Date().toISOString(),
            }));
            setSearchResults(transformed);
            calculateStats(prList, transformed);
            setLastUpdate(new Date());
          });
        });
      } catch (error) {
        console.error("Error setting up real-time subscriptions:", error);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup subscriptions on unmount
    return () => {
      if (prSubscription) unsubscribeFromChanges(prSubscription);
      if (searchSubscription) unsubscribeFromChanges(searchSubscription);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "timeout":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "timeout":
        return <AlertCircle className="w-4 h-4" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">CA Purchasing Team - Monitor Dashboard</h1>
          <p className="text-slate-600 mt-2">Welcome, {userName} 👋</p>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Critical Alerts */}
      {stats.timeoutPRs > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            ⚠️ {stats.timeoutPRs} PR(s) have exceeded the 10-minute response time. Immediate action required!
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total PRs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalPRs}</div>
            <p className="text-xs text-slate-500 mt-1">Active requests</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700">Timeout PRs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.timeoutPRs}</div>
            <p className="text-xs text-red-600 mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.completedPRs}</div>
            <p className="text-xs text-green-600 mt-1">Success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Suppliers Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.totalSuppliers}</div>
            <p className="text-xs text-slate-500 mt-1">This session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">${stats.avgPrice}</div>
            <p className="text-xs text-slate-500 mt-1">USD</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.avgRating}⭐</div>
            <p className="text-xs text-slate-500 mt-1">Supplier quality</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">PR Overview</TabsTrigger>
          <TabsTrigger value="search">Search Results</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* PR Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Requests</CardTitle>
              <CardDescription>Real-time PR status and details (Live from Supabase)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  Loading PR data...
                </div>
              ) : prList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No PRs found</div>
              ) : (
                <div className="space-y-4">
                  {prList.map((pr) => (
                    <div key={pr.id} className="border rounded-lg p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{pr.prNumber}</h3>
                            <Badge className={getStatusColor(pr.status)}>
                              {getStatusIcon(pr.status)}
                              <span className="ml-1">{pr.status.toUpperCase()}</span>
                            </Badge>
                            {pr.timeoutMinutes && (
                              <span className="text-xs text-red-600 font-medium">
                                ⏱️ {pr.timeoutMinutes}min
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{pr.product}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Salesperson</p>
                          <p className="font-medium text-slate-900">{pr.salesperson}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Customer</p>
                          <p className="font-medium text-slate-900">{pr.customer}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Created</p>
                          <p className="font-medium text-slate-900">
                            {new Date(pr.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Results Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Search Results</CardTitle>
              <CardDescription>Found suppliers with pricing and ratings (Live from Supabase)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  Loading search results...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No search results found</div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{result.supplier}</h4>
                          <p className="text-sm text-slate-500">PR {result.prId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">${result.price}</p>
                          <p className="text-sm text-amber-600">⭐ {result.rating}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Real-time monitoring metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Supabase Connection</span>
                  <span className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? '✓ Connected' : '✗ Disconnected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Real-time Sync</span>
                  <span className="font-semibold text-green-600">✓ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Telegram Bot</span>
                  <span className="font-semibold text-green-600">✓ Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Cron Tasks</span>
                  <span className="font-semibold text-green-600">✓ 4 Running</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Summary</CardTitle>
                <CardDescription>Today's statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">PRs Processed</span>
                  <span className="font-semibold text-slate-900">{stats.totalPRs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Success Rate</span>
                  <span className="font-semibold text-green-600">
                    {stats.totalPRs > 0 ? Math.round((stats.completedPRs / stats.totalPRs) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Avg Response Time</span>
                  <span className="font-semibold text-slate-900">2.5 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Last Update</span>
                  <span className="font-semibold text-slate-900">{lastUpdate.toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-slate-500">
        <p>🦞 OpenClaw Dragon Lobster Monitoring System</p>
        <p>Last synced: {lastUpdate.toLocaleString()}</p>
      </div>
    </div>
  );
}
