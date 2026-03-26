<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Pc;
use Carbon\Carbon;

class HeartbeatController extends Controller
{
    public function receive(Request $request)
    {
        $validated = $request->validate([
            'pc_name' => 'required|string|max:100',
            'ip_address' => 'required|ip',
            'cpu_usage' => 'nullable|numeric|min:0|max:100',
            'ram_usage' => 'nullable|numeric|min:0|max:100',
            'ram_total' => 'nullable|numeric',
            'ram_used' => 'nullable|numeric',
            'os_info' => 'nullable|string',
            'screenshot' => 'nullable|string',
        ]);

        if (isset($validated['screenshot']) && strlen($validated['screenshot']) > 2 * 1024 * 1024) {
            $validated['screenshot'] = null; // Ignore huge screenshots
        }

        $pc = Pc::updateOrCreate(
            ['pc_name' => $validated['pc_name']],
            [
                'ip_address' => $validated['ip_address'],
                'cpu_usage' => $validated['cpu_usage'] ?? 0,
                'ram_usage' => $validated['ram_usage'] ?? 0,
                'ram_total' => $validated['ram_total'] ?? 0,
                'ram_used' => $validated['ram_used'] ?? 0,
                'os_info' => $validated['os_info'] ?? null,
                'screenshot' => $validated['screenshot'] ?? null,
                'status' => 'online',
                'last_seen' => Carbon::now(),
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Heartbeat received.',
            'pc_name' => $pc->pc_name,
            'time' => Carbon::now()->toDateTimeString(),
        ]);
    }
}
