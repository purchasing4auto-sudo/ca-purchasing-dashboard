import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Real-time updates will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Subscribe to PR changes in real-time
export function subscribeToPRChanges(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('pr_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'prs', // Adjust table name based on your Supabase schema
      },
      (payload) => {
        console.log('PR change detected:', payload);
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
}

// Subscribe to search results changes
export function subscribeToSearchResults(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('search_results_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'search_results', // Adjust table name based on your Supabase schema
      },
      (payload) => {
        console.log('Search result change detected:', payload);
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
}

// Fetch all PRs
export async function fetchPRs() {
  const { data, error } = await supabase
    .from('prs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching PRs:', error);
    return [];
  }

  return data || [];
}

// Fetch all search results
export async function fetchSearchResults() {
  const { data, error } = await supabase
    .from('search_results')
    .select('*')
    .order('found_at', { ascending: false });

  if (error) {
    console.error('Error fetching search results:', error);
    return [];
  }

  return data || [];
}

// Fetch PR statistics
export async function fetchPRStats() {
  const { data, error } = await supabase
    .from('prs')
    .select('status');

  if (error) {
    console.error('Error fetching PR stats:', error);
    return { total: 0, timeout: 0, completed: 0 };
  }

  const stats = {
    total: data?.length || 0,
    timeout: data?.filter((p: any) => p.status === 'timeout').length || 0,
    completed: data?.filter((p: any) => p.status === 'completed').length || 0,
  };

  return stats;
}

// Unsubscribe from changes
export function unsubscribeFromChanges(subscription: any) {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
}
