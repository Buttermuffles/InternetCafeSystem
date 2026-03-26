<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Command;
use App\Models\Pc;
use Carbon\Carbon;

class CommandController extends Controller
{
    public function send(Request $request)
    {
        $validated = $request->validate([
            'pc_name' => 'required|string',
            'command_type' => 'required|in:lock,shutdown,restart,message,execute,delete_downloads,empty_recycle',
            'command_data' => 'nullable|string'
        ]);

        if (in_array($validated['command_type'], ['message', 'execute']) && empty($validated['command_data'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'command_data is required for message/execute commands.'
            ], 400);
        }

        $command = Command::create([
            'pc_name' => $validated['pc_name'],
            'command_type' => $validated['command_type'],
            'command_data' => $validated['command_data'] ?? null,
            'status' => 'pending',
            'created_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Command '{$validated['command_type']}' sent to {$validated['pc_name']}.",
            'command_id' => $command->id,
        ]);
    }

    public function getCommands($pcName)
    {
        $commands = Command::where('pc_name', $pcName)
            ->where('status', 'pending')
            ->orderBy('created_at', 'ASC')
            ->get();

        return response()->json([
            'status' => 'success',
            'pc_name' => $pcName,
            'commands' => $commands,
            'count' => $commands->count()
        ]);
    }

    public function reportResult(Request $request)
    {
        $validated = $request->validate([
            'command_id' => 'required|integer|exists:commands,id',
            'status' => 'required|in:executed,failed',
            'result' => 'nullable|string'
        ]);

        Command::where('id', $validated['command_id'])->update([
            'status' => $validated['status'],
            'result' => $validated['result'] ?? null,
            'executed_at' => Carbon::now()
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Command result recorded.',
        ]);
    }
}
