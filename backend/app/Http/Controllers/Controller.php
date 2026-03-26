<?php

namespace App\Http\Controllers;

abstract class Controller
{
    protected function cors($response)
    {
        return $response
            ->header('Access-Control-Allow-Origin', '*')
            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization, X-Requested-With')
            ->header('Access-Control-Allow-Credentials', 'true');
    }
}
