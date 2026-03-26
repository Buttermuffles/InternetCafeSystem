<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Pc;
use Carbon\Carbon;

use Illuminate\Support\Facades\Http;

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

        // ── DASHBOARD REAL-TIME BROADCAST ──
        $this->broadcastPcUpdate($pc);

        return $this->cors(response()->json([
            'status' => 'success',
            'message' => 'Heartbeat received.',
            'pc_name' => $pc->pc_name,
            'time' => Carbon::now()->toDateTimeString(),
        ]));
    }

    private function broadcastPcUpdate($pc)
    {
        // For security, only send what's needed for the dashboard lists
        $payload = [
            'pc_name' => $pc->pc_name,
            'status' => 'online',
            'ip_address' => $pc->ip_address,
            'cpu_usage' => $pc->cpu_usage,
            'ram_usage' => $pc->ram_usage,
            'last_seen' => $pc->last_seen
        ];

        // Since Pusher library is not yet available, we broadcast via manual HTTP trigger logic if possible
        // But the easiest/cleanest way is to define it so Laravel can pick it up once broadcast driver is configured.
        // For now, we manually POST to Pusher just like the agent would.
        try {
            $app_id = env('PUSHER_APP_ID');
            $app_key = env('PUSHER_APP_KEY');
            $app_secret = env('PUSHER_APP_SECRET');
            $cluster = env('PUSHER_APP_CLUSTER');

            if ($app_id && $app_key) {
                $pusher = new \Pusher\Pusher($app_key, $app_secret, $app_id, ['cluster' => $cluster, 'useTLS' => true]);
                $pusher->trigger('pcs', 'PcUpdated', $payload);
            }
        }
        catch (\Exception $e) {
        // Silently fail if Pusher client not installed yet
        }
    }
}
