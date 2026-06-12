import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { supabase, logQuery } from '@/lib/supabase';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface PR {
  id: string;
  pr_id: string;
  pr_number: number;
  created_at: string;
  source: string;
  product_name: string;
  quantity?: number | null;
  specs_notes?: string | null;
  salesman?: string | null;
  customer_name?: string | null;
  photos?: string | null;
  status?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  search_method?: string | null;
  comparison?: string | null;
  supplier?: string | null;
  price?: number | null;
  currency?: string | null;
  email_sent_at?: string | null;
  supplier_reply?: string | null;
  notes?: string | null;
  updated_at?: string | null;
  accepted_at?: string | null;
  po?: string | null;
  remark?: string | null;
  follow_up?: number | null;
  notified_leader?: boolean | null;
  [key: string]: any;
}

const ITEMS_PER_PAGE = 8;
const ITEMS_PER_ROW = 2;

// Color schemes for each page
  const colorSchemes = [
    { bg: 'from-blue-50 to-cyan-50', header: 'from-blue-200/40 to-cyan-200/40', border: 'border-blue-200/50', accent: 'bg-blue-100/50', text: 'text-black', label: 'text-black', divider: 'border-blue-100/50' },
    { bg: 'from-emerald-50 to-teal-50', header: 'from-emerald-200/40 to-teal-200/40', border: 'border-emerald-200/50', accent: 'bg-emerald-100/50', text: 'text-black', label: 'text-black', divider: 'border-emerald-100/50' },
    { bg: 'from-purple-50 to-pink-50', header: 'from-purple-200/40 to-pink-200/40', border: 'border-purple-200/50', accent: 'bg-purple-100/50', text: 'text-black', label: 'text-black', divider: 'border-purple-100/50' },
    { bg: 'from-amber-50 to-orange-50', header: 'from-amber-200/40 to-orange-200/40', border: 'border-amber-200/50', accent: 'bg-amber-100/50', text: 'text-black', label: 'text-black', divider: 'border-amber-100/50' },
  ];

export default function Home() {
  const [_location, navigate] = useLocation();
  const [prs, setPrs] = useState<PR[]>([]);
  const [filteredPrs, setFilteredPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isOnline, setIsOnline] = useState(false);

  // Fetch all PRs
  const fetchPRs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase.isConfigured) {
        setIsOnline(false);
        setError('Supabase 未配置');
        return;
      }

      setIsOnline(true);

      const { data, error: err } = await supabase.client
        .from('purchase_requests')
        .select('*')
        .order('pr_number', { ascending: true });

      if (err) throw err;

      const sortedData = (data || []).sort((a: PR, b: PR) => a.pr_number - b.pr_number);
      setPrs(sortedData);
      setFilteredPrs(sortedData);
      setCurrentPage(1);

      // Log the query
      await logQuery('fetch_all_prs', `Fetched ${sortedData.length} PRs`);
    } catch (err) {
      console.error('Error fetching PRs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!supabase.isConfigured) return;

    try {
      const subscription = supabase.client
        .channel('purchase_requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'purchase_requests',
          },
          (payload: any) => {
            console.log('Real-time update:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newPR = payload.new as PR;
              setPrs((prev) => {
                const updated = [...prev, newPR];
                return updated.sort((a: PR, b: PR) => a.pr_number - b.pr_number);
              });
              setFilteredPrs((prev) => {
                const updated = [...prev, newPR];
                return updated.sort((a: PR, b: PR) => a.pr_number - b.pr_number);
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedPR = payload.new as PR;
              setPrs((prev) =>
                prev.map((pr) => (pr.id === updatedPR.id ? updatedPR : pr))
              );
              setFilteredPrs((prev) =>
                prev.map((pr) => (pr.id === updatedPR.id ? updatedPR : pr))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setPrs((prev) => prev.filter((pr) => pr.id !== deletedId));
              setFilteredPrs((prev) => prev.filter((pr) => pr.id !== deletedId));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.client.removeChannel(subscription);
      };
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setCurrentPage(1);

      if (!query.trim()) {
        setFilteredPrs(prs);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const filtered = prs.filter((pr) => {
        const searchableFields = [
          pr.pr_id,
          pr.pr_number.toString(),
          pr.product_name,
          pr.source,
          pr.salesman,
          pr.customer_name,
          pr.supplier,
          pr.notes,
          pr.remark,
          pr.status,
        ];
        return searchableFields.some((field) =>
          field?.toLowerCase().includes(lowerQuery)
        );
      });

      setFilteredPrs(filtered);
      logQuery('search_prs', `Searched for "${query}", found ${filtered.length} results`);
    },
    [prs]
  );

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilteredPrs(prs);
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredPrs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPRs = filteredPrs.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const colorScheme = colorSchemes[(currentPage - 1) % colorSchemes.length];

  const renderDetailField = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Determine color based on field type
    let valueColor = 'text-gray-600'; // Default gray
    const valueStr = String(value).toLowerCase();
    
    // Price fields - green
    if (label.toLowerCase().includes('price') || label.toLowerCase().includes('cost')) {
      valueColor = 'text-green-700 font-semibold';
    }
    // Comparison/Link fields - blue
    else if (label.toLowerCase().includes('comparison') || label.toLowerCase().includes('link')) {
      valueColor = 'text-blue-600 font-medium';
    }
    // Status fields - conditional colors
    else if (label.toLowerCase().includes('status')) {
      if (valueStr.includes('已結案') || valueStr.includes('completed')) {
        valueColor = 'text-green-700 font-semibold';
      } else if (valueStr.includes('已取消') || valueStr.includes('cancelled')) {
        valueColor = 'text-red-700 font-semibold';
      } else {
        valueColor = 'text-yellow-700 font-semibold';
      }
    }
    
    // Check if this is a people field that should show avatar
    const isPeopleField = label.toLowerCase().includes('assignee') || label.toLowerCase().includes('salesman') || label.toLowerCase().includes('customer');
    
    if (isPeopleField) {
      const initials = String(value)
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      return (
        <div key={label} className="flex justify-between py-1 text-xs border-b border-gray-200 border-opacity-50 last:border-b-0 items-center">
          <span className="text-gray-500 min-w-[70px] truncate font-normal">{label}:</span>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
              {initials}
            </div>
            <span className="text-gray-600 text-right flex-1 break-words text-xs">{String(value).substring(0, 30)}</span>
          </div>
        </div>
      );
    }
    
    return (
      <div key={label} className="flex justify-between py-1 text-xs border-b border-gray-200 border-opacity-50 last:border-b-0">
        <span className="text-gray-500 min-w-[70px] truncate font-normal">{label}:</span>
        <span className={`text-right ml-2 flex-1 break-words text-xs ${valueColor}`}>{String(value).substring(0, 40)}</span>
      </div>
    );
  };

  const renderDetailSection = (title: string, fields: Record<string, any>) => {
    const filledFields = Object.entries(fields).filter(([_, value]) => value !== null && value !== undefined && value !== '');
    if (filledFields.length === 0) return null;

    return (
      <div key={title} className="mb-2">
        <h4 className="text-gray-400 text-[10px] mb-1 pb-0.5 uppercase tracking-widest font-semibold">{title}</h4>
        <div className="space-y-0">
          {filledFields.map(([label, value]) => renderDetailField(label, value))}
        </div>
      </div>
    );
  };

  const renderPRCard = (pr: PR) => {
    const createdDate = new Date(pr.created_at);
    const formattedDate = format(createdDate, 'MM-dd HH:mm', { locale: zhTW });

    const basicInfo = {
      'PR ID': pr.pr_id,
      'PR#': `#${pr.pr_number}`,
      'Created': formattedDate,
      'Source': pr.source,
    };

    const productInfo = {
      'Product': pr.product_name,
      'Quantity': pr.quantity,
      'Specs Notes': pr.specs_notes ? pr.specs_notes.substring(0, 30) : '-',
    };

    const peopleInfo = {
      'Salesman': pr.salesman,
      'Customer': pr.customer_name,
      'Assignee': pr.assignee_name,
    };

    const statusInfo = {
      'Status': pr.status,
      'Search Method': pr.search_method,
      'Comparison': pr.comparison ? pr.comparison.substring(0, 20) : '-',
      'Follow-up': pr.follow_up,
    };

    const supplierInfo = {
      'Supplier': pr.supplier,
      'Price': pr.price ? `${pr.price} ${pr.currency || 'USD'}` : '-',
      'Photos': pr.photos ? 'Yes' : '-',
    };

    const documentInfo = {
      'PO': pr.po,
      'Notes': pr.notes ? pr.notes.substring(0, 25) : '-',
      'Remark': pr.remark ? pr.remark.substring(0, 20) : '-',
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 border-opacity-30 shadow-sm overflow-hidden h-full">
        {/* PR Header */}
        <div className={`bg-gradient-to-r ${colorScheme.header} px-3 py-2.5 border-b border-gray-200 border-opacity-30`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-base font-bold ${colorScheme.text} truncate`}>{pr.pr_id}</span>
                <span className={`inline-block px-2 py-0.5 ${colorScheme.accent} ${colorScheme.text} text-xs font-semibold rounded-full truncate`}>
                  {pr.source}
                </span>
              </div>
              {pr.status && (
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full truncate mb-1 ${
                  pr.status.includes('已取消') ? 'bg-red-100 text-red-800' :
                  pr.status.includes('已結案') ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {pr.status}
                </span>
              )}
              <p className={`text-xs ${colorScheme.text} font-medium truncate`}>{pr.product_name}</p>
            </div>
          </div>
        </div>

        {/* PR Details - Grid Layout */}
        <div className="px-3 py-2.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              {renderDetailSection('BASIC', basicInfo)}
              {renderDetailSection('PRODUCT', productInfo)}
            </div>
            <div className="border-l border-gray-300 border-opacity-40 pl-3">
              {renderDetailSection('PEOPLE', peopleInfo)}
              {renderDetailSection('STATUS', statusInfo)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              {renderDetailSection('SUPPLIER', supplierInfo)}
            </div>
            <div>
              {renderDetailSection('DOCUMENT', documentInfo)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!supabase.isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">⚠️ 配置錯誤</h1>
          <p className="text-slate-700">Supabase 環境變數未配置</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colorScheme.bg} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">
                CA Purchasing Team
              </h1>
              <p className="text-slate-700 text-base">Monitor Dashboard</p>
              <p className="text-slate-600 text-sm mt-1">Welcome, User 👋</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                isOnline ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-600' : 'bg-red-600'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <p className="text-slate-600 text-xs mt-2">Updated: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className={`bg-white rounded-lg p-3 border ${colorScheme.border} shadow-sm`}>
              <p className={`${colorScheme.label} text-xs font-medium`}>Total PRs</p>
              <p className={`text-2xl font-bold ${colorScheme.text} mt-1`}>{prs.length}</p>
            </div>
            <div className={`bg-white rounded-lg p-3 border ${colorScheme.border} shadow-sm`}>
              <p className={`${colorScheme.label} text-xs font-medium`}>Search Results</p>
              <p className={`text-2xl font-bold ${colorScheme.text} mt-1`}>{filteredPrs.length}</p>
            </div>
            <div className={`bg-white rounded-lg p-3 border ${colorScheme.border} shadow-sm`}>
              <p className={`${colorScheme.label} text-xs font-medium`}>Current Page</p>
              <p className={`text-2xl font-bold ${colorScheme.text} mt-1`}>{currentPage} / {totalPages}</p>
            </div>
            <div className={`bg-white rounded-lg p-3 border ${colorScheme.border} shadow-sm`}>
              <p className={`${colorScheme.label} text-xs font-medium`}>Items Per Page</p>
              <p className={`text-2xl font-bold ${colorScheme.text} mt-1`}>{ITEMS_PER_PAGE}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search PR ID, Product, Supplier, Customer..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 pr-12 py-3 bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg shadow-sm focus:ring-slate-400 focus:border-slate-400"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {/* Main Content - Left Right Split */}
        {!loading && filteredPrs.length > 0 && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            {currentPRs.map((pr, index) => (
              <div key={pr.id}>
                {renderPRCard(pr)}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPrs.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-slate-700 text-lg mb-4">No PRs found</p>
              {searchQuery && (
                <Button
                  onClick={handleClearSearch}
                  className="bg-slate-600 hover:bg-slate-700 text-white rounded-lg"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredPrs.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 flex-wrap bg-white rounded-lg p-4 border border-slate-300 shadow-sm">
            <Button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="bg-slate-600 hover:bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const page = Math.max(1, currentPage - 3) + i;
                if (page > totalPages) return null;
                return (
                  <Button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={currentPage === page 
                      ? 'bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-lg text-xs transition-colors'}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="bg-slate-600 hover:bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ChevronRight size={16} />
            </Button>

            <span className="text-slate-700 text-xs ml-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
