import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Users, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  avgRating: number;
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

  // Get user info from URL parameters
  const params = new URLSearchParams(window.location.search);
  const userName = params.get("name") || "User";

  useEffect(() => {
    // Simulate fetching data from Supabase
    // In production, replace with actual Supabase client calls
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock PR data
        const mockPRs: PR[] = [
          {
            id: "1",
            prNumber: "PR-231",
            product: "Injecta Athena AC.VSA Chemical Feeding Pump",
            salesperson: "AIA CHAN",
            customer: "FNB Mr Mc",
            status: "pending",
            createdAt: new Date().toISOString(),
            timeoutMinutes: 8,
          },
          {
            id: "2",
            prNumber: "PR-230",
            product: "Industrial Valve Assembly",
            salesperson: "John Doe",
            customer: "ABC Corp",
            status: "timeout",
            createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
            timeoutMinutes: 15,
          },
          {
            id: "3",
            prNumber: "PR-229",
            product: "Electrical Components",
            salesperson: "Jane Smith",
            customer: "XYZ Ltd",
            status: "completed",
            createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
          },
        ];

        // Mock search results
        const mockResults: SearchResult[] = [
          {
            id: "1",
            prId: "1",
            supplier: "MISUMI Industrial",
            price: 1250,
            rating: 4.8,
            foundAt: new Date().toISOString(),
          },
          {
            id: "2",
            prId: "1",
            supplier: "Festo Worldwide",
            price: 1180,
            rating: 4.6,
            foundAt: new Date().toISOString(),
          },
          {
            id: "3",
            prId: "2",
            supplier: "Sheikhan",
            price: 890,
            rating: 4.3,
            foundAt: new Date(Date.now() - 5 * 60000).toISOString(),
          },
        ];

        setPrList(mockPRs);
        setSearchResults(mockResults);

        // Calculate stats
        setStats({
          totalPRs: mockPRs.length,
          timeoutPRs: mockPRs.filter(p => p.status === "timeout").length,
          completedPRs: mockPRs.filter(p => p.status === "completed").length,
          totalSuppliers: mockResults.length,
          avgPrice: Math.round(mockResults.reduce((sum, r) => sum + r.price, 0) / mockResults.length),
          avgRating: (mockResults.reduce((sum, r) => sum + r.rating, 0) / mockResults.length).toFixed(1) as any,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900">OpenClaw Monitor Dashboard</h1>
        <p className="text-slate-600 mt-2">Welcome, {userName} 👋</p>
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
              <CardDescription>Real-time PR status and details</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading PR data...</div>
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
              <CardDescription>Found suppliers with pricing and ratings</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading search results...</div>
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
                  <span className="text-slate-600">Response Time</span>
                  <span className="font-semibold text-green-600">✓ Normal</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Database Connection</span>
                  <span className="font-semibold text-green-600">✓ Connected</span>
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
                  <span className="font-semibold text-slate-900">Just now</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-slate-500">
        <p>🦞 OpenClaw Dragon Lobster Monitoring System</p>
        <p>Last synced: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
