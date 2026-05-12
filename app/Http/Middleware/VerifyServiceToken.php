<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyServiceToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('services.mcp.token');
        if (! is_string($expected) || $expected === '') {
            abort(503, 'MCP service token not configured');
        }

        $header = $request->bearerToken();
        if (! is_string($header) || ! hash_equals($expected, $header)) {
            abort(401, 'Invalid service token');
        }

        return $next($request);
    }
}
