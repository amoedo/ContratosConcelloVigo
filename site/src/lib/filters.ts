export interface FilterState {
  year: string;
  unit: string;
  vendor: string;
  type: string;
  competition: string;
  amount: string;
  topic: string;
  q: string;
  date_from: string;
  date_to: string;
  min_amount: string;
  max_amount: string;
  expediente: string;
  alert: string;
  quality: string;
  sort: string;
  direction: string;
  page: string;
  lang: string;
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
  date_from: '', date_to: '', min_amount: '', max_amount: '', expediente: '', alert: '', quality: '',
  sort: 'date', direction: 'desc', page: '1', lang: '',
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
    date_from: params.get('date_from') ?? '',
    date_to: params.get('date_to') ?? '',
    min_amount: params.get('min_amount') ?? '',
    max_amount: params.get('max_amount') ?? '',
    expediente: params.get('expediente') ?? '',
    alert: params.get('alert') ?? '',
    quality: params.get('quality') ?? '',
    sort: params.get('sort') ?? 'date',
    direction: params.get('direction') ?? 'desc',
    page: params.get('page') ?? '1',
    lang: params.get('lang') ?? '',
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
