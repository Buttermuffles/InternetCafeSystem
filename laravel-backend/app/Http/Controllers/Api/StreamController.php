<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class StreamController extends Controller
{
    private const FRAME_TTL_SECONDS = 20;
    private const MAX_FRAME_BASE64_BYTES = 1100 * 1024;

    public function uploadFrame(Request $request)
    {
        $validated = $request->validate([
            'pc_name' => 'required|string|max:100',
            'frame_base64' => 'required|string',
            'mime_type' => 'nullable|string|max:50',
            'width' => 'nullable|integer|min:1|max:3840',
            'height' => 'nullable|integer|min:1|max:2160',
            'fps' => 'nullable|numeric|min:1|max:60',
            'quality' => 'nullable|integer|min:10|max:100',
            'capture_ms' => 'nullable|integer|min:0|max:60000',
            'upload_ms' => 'nullable|integer|min:0|max:60000',
            'sequence' => 'nullable|integer|min:0',
        ]);

        $frameBase64 = $validated['frame_base64'];
        if (str_contains($frameBase64, 'base64,')) {
            $frameBase64 = explode('base64,', $frameBase64, 2)[1] ?? $frameBase64;
        }

        if (strlen($frameBase64) > self::MAX_FRAME_BASE64_BYTES) {
            return response()->json([ 'status' => 'error', 'message' => 'Live frame is too large.' ], 413);
        }

        $mimeType = $validated['mime_type'] ?? 'image/jpeg';
        $now = Carbon::now();

        $payload = [
            'pc_name' => $validated['pc_name'],
            'frame_src' => "data:{$mimeType};base64,{$frameBase64}",
            'mime_type' => $mimeType,
            'width' => $validated['width'] ?? null,
            'height' => $validated['height'] ?? null,
            'fps' => $validated['fps'] ?? null,
            'quality' => $validated['quality'] ?? null,
            'capture_ms' => $validated['capture_ms'] ?? null,
            'upload_ms' => $validated['upload_ms'] ?? null,
            'sequence' => $validated['sequence'] ?? null,
            'updated_at' => $now->toDateTimeString(),
        ];

        Cache::put($this->frameCacheKey($validated['pc_name']), $payload, self::FRAME_TTL_SECONDS);

        return response()->json([ 'status' => 'success', 'data' => ['pc_name' => $validated['pc_name'], 'updated_at' => $payload['updated_at']] ]);
    }

    public function latestFrame(string $pc_name)
    {
        $frame = Cache::get($this->frameCacheKey($pc_name));
        if (!$frame) {
            return response()->json([ 'status' => 'error', 'message' => 'No frame available.' ], 404);
        }

        return response()->json([ 'status' => 'success', 'data' => $frame ]);
    }

    public function latestFrames(Request $request)
    {
        $pcNames = $this->parsePcNames($request->query('pc_names', ''));
        $data = [];

        foreach ($pcNames as $pcName) {
            $frame = Cache::get($this->frameCacheKey($pcName));
            if ($frame) {
                $data[$pcName] = $frame;
            }
        }

        return response()->json([ 'status' => 'success', 'data' => $data, 'count' => count($data) ]);
    }

    private function frameCacheKey(string $pcName): string
    {
        return 'pc_live_frame:' . $pcName;
    }

    private function parsePcNames(string $value): array
    {
        $pcNames = array_filter(array_map('trim', explode(',', $value)));
        $pcNames = array_values(array_unique($pcNames));

        if (count($pcNames) > 50) {
            $pcNames = array_slice($pcNames, 0, 50);
        }

        return $pcNames;
    }
}
