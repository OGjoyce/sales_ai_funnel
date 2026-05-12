<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessAgentFileJob;
use App\Models\AgentFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AgentKbController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $files = AgentFile::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get([
                'id',
                'original_name',
                'mime_type',
                'extension',
                'size_bytes',
                'status',
                'error',
                'chunks_count',
                'created_at',
            ]);

        return response()->json(['files' => $files]);
    }

    public function upload(Request $request)
    {
        $user = $request->user();

        $count = AgentFile::query()->where('user_id', $user->id)->count();
        if ($count >= 5) {
            return response()->json([
                'error' => 'Max 5 archivos por agente. Elimina uno para subir otro.',
            ], 422);
        }

        $validated = $request->validate([
            'file' => [
                'required',
                'file',
                'max:12288', // 12MB in KB
                'mimes:pdf,txt,docx,csv,xlsx,md,html,htm',
            ],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $validated['file'];

        $ext = strtolower($file->getClientOriginalExtension());
        $storedPath = $file->store('agent_kb/' . $user->id, 'local');

        $row = AgentFile::create([
            'user_id' => $user->id,
            'original_name' => $file->getClientOriginalName(),
            'stored_path' => $storedPath,
            'mime_type' => $file->getClientMimeType(),
            'extension' => $ext,
            'size_bytes' => $file->getSize(),
            'status' => 'queued',
        ]);

        ProcessAgentFileJob::dispatch($row->id);

        return response()->json([
            'ok' => true,
            'file' => $row,
        ], 201);
    }

    public function destroy(Request $request, AgentFile $agentFile)
    {
        $user = $request->user();
        if ((int)$agentFile->user_id !== (int)$user->id) {
            abort(404);
        }

        // Delete storage + chunks via FK cascade.
        Storage::disk('local')->delete($agentFile->stored_path);
        $agentFile->delete();

        return response()->json(['ok' => true]);
    }

    public function show(Request $request, AgentFile $agentFile)
    {
        $user = $request->user();
        if ((int)$agentFile->user_id !== (int)$user->id) {
            abort(404);
        }

        return response()->json([
            'file' => $agentFile->only([
                'id',
                'original_name',
                'mime_type',
                'extension',
                'size_bytes',
                'status',
                'error',
                'chunks_count',
                'created_at',
                'updated_at',
            ]),
        ]);
    }
}
