<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\ApiKey;

class VerifyApiKey
{
    /**
     * Handle an incoming request.
     * Ensure request has a valid X-API-Key
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key');

        // Allow preflight CORS checks unconditionally
        if ($request->isMethod('options')) {
            return response()->json([], 204, [
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, X-API-Key, Authorization, X-Requested-With',
            ]);
        }

        if (empty($apiKey)) {
            return response()->json([
                'status' => 'error',
                'message' => 'API key is required. Include X-API-Key header.',
            ], 401);
        }

        // Check against environment variable first
        if ($apiKey === env('ICAFE_API_KEY')) {
            $response = $next($request);
            return $this->addCorsHeaders($response);
        }

        // Fallback: Check against database
        $isValidDbKey = ApiKey::where('api_key', $apiKey)
            ->where('is_active', 1)
            ->exists();

        if (!$isValidDbKey) {
            return $this->addCorsHeaders(response()->json([
                'status' => 'error',
                'message' => 'Invalid or inactive API key.',
            ], 403));
        }

        $response = $next($request);
        return $this->addCorsHeaders($response);
    }

    private function addCorsHeaders($response)
    {
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization, X-Requested-With');
        return $response;
    }
}
