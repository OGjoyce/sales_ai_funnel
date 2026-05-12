import type { SVGAttributes } from 'react';

// Velora mark: a minimal "V" monogram with a premium cut.
// Works well at small sizes (sidebar icon) and supports `fill-current`.
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Outer shape (soft diamond) */}
            <path
                d="M32 4C42.5 4 52 11.8 56 21.7c3.5 8.7 1.7 20-5.2 27.1C45 54.9 38.7 60 32 60S19 54.9 13.2 48.8C6.3 41.7 4.5 30.4 8 21.7 12 11.8 21.5 4 32 4Z"
                fill="currentColor"
                opacity="0.18"
            />

            {/* V monogram */}
            <path
                d="M18.6 20.8c-.6-1.3.3-2.8 1.7-2.8h6.1c.8 0 1.5.5 1.8 1.2l8.1 20.1c.3.8 1.4.8 1.7 0l8.1-20.1c.3-.7 1-1.2 1.8-1.2h6.1c1.4 0 2.3 1.5 1.7 2.8L40.5 50.2c-.3.7-1 1.1-1.7 1.1h-9.6c-.7 0-1.4-.4-1.7-1.1L18.6 20.8Z"
                fill="currentColor"
            />

            {/* Inner cut (gives a premium notch) */}
            <path
                d="M32 28.6 27.6 18h8.8L32 28.6Z"
                fill="white"
                opacity="0.9"
            />
        </svg>
    );
}
