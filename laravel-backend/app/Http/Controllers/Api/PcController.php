<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Pc;

class PcController extends Controller
{
    public function index(Request $request)
    {
        $includeScreenshot = $request->query('include_screenshot') !== '0';
        $pcs = Pc::getWithStatus();

        if (!$includeScreenshot) {
            $pcs->transform(function ($pc) {
                // If screenshot exists, just return true boolean instead of base64 to save bandwidth
                $pc->screenshot = $pc->screenshot ? true : false;
                return $pc;
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $pcs,
            'count' => $pcs->count(),
            'time' => now()->toDateTimeString(),
        ]);
    }

    public function show($pcName)
    {
        $pc = Pc::where('pc_name', $pcName)->firstOrFail();
        return response()->json([
            'status' => 'success',
            'data' => $pc,
        ]);
    }
}
