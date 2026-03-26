<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\HeartbeatController;
use App\Http\Controllers\Api\PcController;
use App\Http\Controllers\Api\CommandController;
use App\Http\Controllers\Api\StreamController;
use App\Http\Controllers\Api\VideoController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::options('/{any}', function () {
    return response()->json([], 204, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, X-API-Key, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials' => 'true',
    ]);
})->where('any', '.*');

// Backward-compatible public routes (no auth) for easier initial connectivity
Route::get('/pcs', [PcController::class, 'index']);
Route::get('/pcs/{pc_name}', [PcController::class, 'show']);
Route::post('/send-command', [CommandController::class, 'send']);
Route::get('/get-command/{pc_name}', [CommandController::class, 'getCommands']);
Route::post('/command-result', [CommandController::class, 'reportResult']);
Route::get('/command-result/{id}', [CommandController::class, 'getCommandResult']);
Route::post('/heartbeat', [HeartbeatController::class, 'receive']);
Route::post('/streams/frame', [StreamController::class, 'uploadFrame']);
Route::get('/streams/frame/{pc_name}', [StreamController::class, 'latestFrame']);
Route::get('/streams/frames', [StreamController::class, 'latestFrames']);

// WebRTC Signaling
Route::post('/streams/webrtc/offer-session', [StreamController::class, 'postOffer']);
Route::get('/streams/webrtc/offer-agent/{pc_name}', [StreamController::class, 'getOffer']);
Route::post('/streams/webrtc/answer-session', [StreamController::class, 'postAnswer']);
Route::get('/streams/webrtc/answer-agent/{pc_name}', [StreamController::class, 'getAnswer']);

Route::post('/videos/upload', [VideoController::class, 'upload']);
Route::get('/videos/latest/{pc_name}', [VideoController::class, 'latest']);

Route::middleware('api.auth')->group(function () {
    // Heartbeat
    Route::post('/heartbeat', [HeartbeatController::class, 'receive']);

    // PCs
    Route::get('/pcs', [PcController::class, 'index']);
    Route::get('/pcs/{pc_name}', [PcController::class, 'show']);

    // Commands
    Route::post('/send-command', [CommandController::class, 'send']);
    Route::get('/get-command/{pc_name}', [CommandController::class, 'getCommands']);
    Route::post('/command-result', [CommandController::class, 'reportResult']);
});
