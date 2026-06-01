<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVeloraAdmin
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->isVeloraAdmin()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Admin access required.'], 403);
            }

            abort(403, 'Admin access required.');
        }

        return $next($request);
    }
}
