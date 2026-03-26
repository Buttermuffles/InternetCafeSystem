<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Pc extends Model
{
    protected $table = 'pcs';
    protected $guarded = ['id'];

    // Update missing online status to offline if older than 15 secs
    // and broadcast any changes so realtime clients can update immediately.
    public static function getWithStatus()
    {
        $staleThreshold = Carbon::now()->subSeconds(15);
        $stalePcs = self::where('last_seen', '<', $staleThreshold)
            ->where('status', 'online')
            ->get();

        if ($stalePcs->isNotEmpty()) {
            // Set status offline in db first.
            self::whereIn('id', $stalePcs->pluck('id'))->update(['status' => 'offline']);

            // Broadcast each offline transition.
            foreach ($stalePcs as $pc) {
                $pc->status = 'offline';
                self::broadcastPcStatus($pc);
            }
        }

        return self::orderBy('pc_name', 'ASC')->get();
    }

    public static function broadcastPcStatus(Pc $pc)
    {
        $payload = [
            'pc_name' => $pc->pc_name,
            'status' => $pc->status,
            'ip_address' => $pc->ip_address,
            'cpu_usage' => $pc->cpu_usage,
            'ram_usage' => $pc->ram_usage,
            'last_seen' => $pc->last_seen,
        ];

        self::triggerPusher('PcUpdated', $payload);
    }

    private static function triggerPusher(string $event, array $payload)
    {
        try {
            $app_id = env('PUSHER_APP_ID');
            $app_key = env('PUSHER_APP_KEY');
            $app_secret = env('PUSHER_APP_SECRET');
            $cluster = env('PUSHER_APP_CLUSTER');

            if ($app_id && $app_key && $app_secret) {
                $pusher = new \Pusher\Pusher($app_key, $app_secret, $app_id, ['cluster' => $cluster, 'useTLS' => true]);
                $pusher->trigger('pcs', $event, $payload);
            }
        } catch (\Exception $e) {
            // Silently ignore Pusher failure in this best-effort signal path.
        }
    }
}
