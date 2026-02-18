'use client';

import { useEffect } from 'react';

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function KeepAlive() {
    useEffect(() => {
        // Function to ping the backend health endpoint
        const pingBackend = async () => {
            try {
                // Determine API URL - using relative path for same-origin or env var
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                const response = await fetch(`${apiUrl}/api/v1/health`, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });

                if (response.ok) {
                    console.log('[KeepAlive] Backend ping successful');
                } else {
                    console.warn('[KeepAlive] Backend ping failed', response.status);
                }
            } catch (error) {
                console.error('[KeepAlive] Error pinging backend:', error);
            }
        };

        // Initial ping
        pingBackend();

        // Set up interval
        const intervalId = setInterval(pingBackend, PING_INTERVAL);

        // Cleanup on unmount
        return () => clearInterval(intervalId);
    }, []);

    // This component doesn't render anything
    return null;
}
