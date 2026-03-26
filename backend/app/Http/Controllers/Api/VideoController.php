<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class VideoController extends Controller
{
    private const VIDEO_TTL_SECONDS = 1800; // 30 minutes

    public function upload(Request $request)
    {
        $validated = $request->validate([
            'pc_name' => 'required|string|max:100',
            'mime_type' => 'required|string|max:50',
            'video_base64' => 'required|string',
            'duration_ms' => 'nullable|integer|min:0',
        ]);

        $pcName = $validated['pc_name'];
        $mimeType = $validated['mime_type'];
        $videoBase64 = $validated['video_base64'];

        if (str_contains($videoBase64, 'base64,')) {
            $videoBase64 = explode('base64,', $videoBase64, 2)[1] ?? $videoBase64;
        }

        $contents = base64_decode($videoBase64, true);
        if ($contents === false) {
            return $this->cors(response()->json(['status' => 'error', 'message' => 'Invalid base64 video payload.'], 400));
        }

        $clipId = uniqid('clip_', true);
        $fileName = "{$clipId}.mp4";
        $directory = "video_clips/{$pcName}";
        $fullPath = "{$directory}/{$fileName}";

        Storage::put($fullPath, $contents);

        $record = [
            'clip_id' => $clipId,
            'pc_name' => $pcName,
            'mime_type' => $mimeType,
            'video_src' => "data:{$mimeType};base64,{$videoBase64}",
            'video_base64' => $videoBase64,
            'duration_ms' => $validated['duration_ms'] ?? 0,
            'created_at' => Carbon::now()->toDateTimeString(),
            'path' => $fullPath,
        ];

        Cache::put($this->videoCacheKey($pcName), $record, self::VIDEO_TTL_SECONDS);

        return $this->cors(response()->json(['status' => 'success', 'data' => $record]));
    }

    public function latest(string $pcName)
    {
        $record = Cache::get($this->videoCacheKey($pcName));

        if (!$record) {
            return $this->cors(response()->json(['status' => 'error', 'message' => 'No video available for this PC.'], 404));
        }

        if (!Storage::exists($record['path'])) {
            return $this->cors(response()->json(['status' => 'error', 'message' => 'Stored video file missing.'], 404));
        }

        // if video is big, do not re-embed; already included in record.
        return $this->cors(response()->json(['status' => 'success', 'data' => $record]));
    }

    private function videoCacheKey(string $pcName): string
    {
        return 'pc_latest_video:' . $pcName;
    }
}
