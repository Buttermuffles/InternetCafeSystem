<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Pc extends Model
{
    protected $table = 'pcs';
    protected $guarded = ['id'];

    // Update missing online status to offline if older than 15 secs
    public static function getWithStatus()
    {
        self::where('last_seen', '<', Carbon::now()->subSeconds(15))
            ->where('status', 'online')
            ->update(['status' => 'offline']);

        return self::orderBy('pc_name', 'ASC')->get();
    }
}
