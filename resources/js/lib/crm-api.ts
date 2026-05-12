export function apiUrl(path: string): string {
    if (path.startsWith('http')) {
        return path;
    }

    return `/api${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function crmFetch(
    csrfToken: string,
    path: string,
    init: RequestInit = {},
    options?: { timeoutMs?: number },
): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-CSRF-TOKEN', csrfToken);

    if (
        init.body &&
        !(init.body instanceof FormData) &&
        !headers.has('Content-Type')
    ) {
        headers.set('Content-Type', 'application/json');
    }

    let signal = init.signal;

    if (options?.timeoutMs && typeof AbortSignal !== 'undefined') {
        const T = (
            AbortSignal as typeof AbortSignal & {
                timeout?: (ms: number) => AbortSignal;
            }
        ).timeout;

        if (typeof T === 'function') {
            const tSignal = T(options.timeoutMs);
            signal =
                init.signal && typeof AbortSignal.any === 'function'
                    ? AbortSignal.any([init.signal, tSignal])
                    : tSignal;
        }
    }

    return fetch(apiUrl(path), {
        credentials: 'same-origin',
        ...init,
        headers,
        ...(signal ? { signal } : {}),
    });
}
