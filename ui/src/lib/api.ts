const trimmedBase = (import.meta.env.VITE_API_URL || 'http://localhost:9092/api').replace(/\/$/, '');

export function apiUrl(path: string): string {
    return `${trimmedBase}${path.startsWith('/') ? path : `/${path}`}`;
}
