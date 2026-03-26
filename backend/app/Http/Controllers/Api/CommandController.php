<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Command;
use App\Models\Pc;
use Carbon\Carbon;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CommandController extends Controller
{
    public function send(Request $request)
    {
        $validated = $request->validate([
            'pc_name' => 'required|string',
            'command_type' => 'required|in:lock,shutdown,restart,message,execute,delete_downloads,empty_recycle,record_video,get_processes',
            'command_data' => 'nullable|string'
        ]);

        if (in_array($validated['command_type'], ['message', 'execute', 'record_video']) && empty($validated['command_data'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'command_data is required for message/execute/record_video commands.'
            ], 400);
        }

        $command = Command::create([
            'pc_name' => $validated['pc_name'],
            'command_type' => $validated['command_type'],
            'command_data' => $validated['command_data'] ?? null,
            'status' => 'pending',
            'created_at' => Carbon::now(),
        ]);

        // ── PUSH TO AGENT ──
        $this->pushCommandToAgent($command);

        return $this->cors(response()->json([
            'status' => 'success',
            'message' => "Command '{$validated['command_type']}' sent to {$validated['pc_name']}.",
            'command_id' => $command->id,
        ]));
    }

    private function pushCommandToAgent($command)
    {
        $pc = Pc::where('pc_name', $command->pc_name)->first();
        if (!$pc || !$pc->ip_address)
            return;

        // Fire and forget - don't wait for agent response to avoid blocking Laravel
        try {
            Http::timeout(1)->post("http://{$pc->ip_address}:9900/execute-command", [
                'id' => $command->id,
                'command_type' => $command->command_type,
                'command_data' => $command->command_data
            ]);
        }
        catch (\Exception $e) {
            // Agent might be offline or port blocked, it will poll fallback if needed
            Log::warning("Could not push command to {$pc->pc_name} at {$pc->ip_address}: " . $e->getMessage());
        }
    }

    public function getCommandResult($id)
    {
        $command = Command::find($id);
        if (!$command) {
            return $this->cors(response()->json(['status' => 'error', 'message' => 'Command not found.'], 404));
        }

        return $this->cors(response()->json([
            'status' => 'success',
            'data' => $command
        ]));
    }

    public function getCommands($pcName)
    {
        $commands = Command::where('pc_name', $pcName)
            ->where('status', 'pending')
            ->orderBy('created_at', 'ASC')
            ->get();

        return $this->cors(response()->json([
            'status' => 'success',
            'pc_name' => $pcName,
            'commands' => $commands,
            'count' => $commands->count()
        ]));
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

        return $this->cors(response()->json([
            'status' => 'success',
            'message' => 'Command result recorded.',
        ]));
    }
}
