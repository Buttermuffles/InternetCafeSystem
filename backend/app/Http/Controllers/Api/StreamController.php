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
        try {
            $validated = $request->validate([
                'pc_name' => 'required|string',
                'frame_base64' => 'required|string',
                'mime_type' => 'nullable|string',
                'width' => 'nullable',
                'height' => 'nullable',
                'fps' => 'nullable',
                'quality' => 'nullable',
                'capture_ms' => 'nullable',
                'upload_ms' => 'nullable',
                'sequence' => 'nullable',
            ]);
        }
        catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed: ' . json_encode($e->errors()),
                'received' => array_keys($request->all())
            ], 422);
        }

        $frameBase64 = $validated['frame_base64'];
        if (str_contains($frameBase64, 'base64,')) {
            $frameBase64 = explode('base64,', $frameBase64, 2)[1] ?? $frameBase64;
        }

        if (strlen($frameBase64) > self::MAX_FRAME_BASE64_BYTES) {
            return response()->json(['status' => 'error', 'message' => 'Live frame is too large.'], 413);
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

        return $this->cors(response()->json(['status' => 'success', 'data' => ['pc_name' => $validated['pc_name'], 'updated_at' => $payload['updated_at']]]));
    }

    public function latestFrame(string $pc_name)
    {
        $frame = Cache::get($this->frameCacheKey($pc_name));
        if (!$frame) {
            return $this->cors(response()->json(['status' => 'error', 'message' => 'No frame available.'], 404));
        }

        return $this->cors(response()->json(['status' => 'success', 'data' => $frame]));
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

        return $this->cors(response()->json(['status' => 'success', 'data' => $data, 'count' => count($data)]));
    }

    public function postOffer(Request $request)
    {
        $v = $request->validate([
            'pc_name' => 'required|string',
            'sdp' => 'required|string',
        ]);

        Cache::put("webrtc:offer:{$v['pc_name']}", [
            'pc_name' => $v['pc_name'],
            'offer' => $v['sdp'],
            'status' => 'ready',
            'created_at' => now()->toDateTimeString(),
        ], 30); // Valid for 30s

        // Clear existing answer
        Cache::forget("webrtc:answer:{$v['pc_name']}");

        return $this->cors(response()->json(['status' => 'success']));
    }

    public function getOffer(string $pcName)
    {
        $offer = Cache::get("webrtc:offer:{$pcName}");
        if (!$offer)
            return $this->cors(response()->json(['status' => 'empty'], 204));

        // PC (agent) consuming the offer
        Cache::forget("webrtc:offer:{$pcName}");

        return $this->cors(response()->json($offer));
    }

    public function postAnswer(Request $request)
    {
        $v = $request->validate([
            'pc_name' => 'required|string',
            'sdp' => 'required|string',
        ]);

        Cache::put("webrtc:answer:{$v['pc_name']}", [
            'pc_name' => $v['pc_name'],
            'answer' => $v['sdp'],
            'status' => 'ready',
            'created_at' => now()->toDateTimeString(),
        ], 30);

        return $this->cors(response()->json(['status' => 'success']));
    }

    public function getAnswer(string $pcName)
    {
        $answer = Cache::get("webrtc:answer:{$pcName}");
        if (!$answer)
            return $this->cors(response()->json(['status' => 'empty'], 204));

        // Admin consuming the answer
        Cache::forget("webrtc:answer:{$pcName}");

        return $this->cors(response()->json($answer));
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
