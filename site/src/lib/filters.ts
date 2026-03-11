export interface FilterState {
  year: string;
  unit: string;
  vendor: string;
  type: string;
  competition: string;
  amount: string;
  topic: string;
  q: string;
}

export const defaultFilters: FilterState = {
  year: '',
  unit: '',
  vendor: '',
  type: '',
  competition: '',
  amount: '',
  topic: '',
  q: '',
};

export function readFilters(search: string): FilterState {
  const params = new URLSearchParams(search);
  return {
    year: params.get('year') ?? '',
    unit: params.get('unit') ?? '',
    vendor: params.get('vendor') ?? '',
    type: params.get('type') ?? '',
    competition: params.get('competition') ?? '',
    amount: params.get('amount') ?? '',
    topic: params.get('topic') ?? '',
    q: params.get('q') ?? '',
  };
}

export function buildSearch(filters: Partial<FilterState>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const search = params.toString();
  return search ? `?${search}` : '';
}

export function appendCurrentSearch(pathname: string, search: string): string {
  return `${pathname}${search || ''}`;
}
