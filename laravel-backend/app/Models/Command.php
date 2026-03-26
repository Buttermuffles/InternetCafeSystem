<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Command extends Model
{
    protected $table = 'commands';
    protected $guarded = ['id'];
    public $timestamps = false;

    protected $casts = [
        'created_at' => 'datetime',
        'executed_at' => 'datetime',
    ];
}
