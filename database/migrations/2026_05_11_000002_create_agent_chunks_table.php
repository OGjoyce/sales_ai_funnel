<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('agent_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_file_id')->constrained('agent_files')->cascadeOnDelete();

            $table->unsignedInteger('chunk_index');
            $table->longText('content');
            $table->string('content_hash', 64);
            $table->unsignedInteger('tokens_estimate')->default(0);
            $table->json('meta')->nullable();

            // pgvector column (created via raw statement below for Postgres)
            $table->timestamps();

            $table->unique(['agent_file_id', 'chunk_index']);
            $table->index(['user_id', 'agent_file_id']);
        });

        // Add pgvector embedding column only on Postgres.
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            // Ensure extension exists (requires superuser once).
            DB::statement('CREATE EXTENSION IF NOT EXISTS vector');

            // 1536 dims for text-embedding-3-small.
            DB::statement('ALTER TABLE agent_chunks ADD COLUMN embedding vector(1536)');

            // Basic ANN index (requires ANALYZE after data load). Optional but recommended.
            DB::statement('CREATE INDEX IF NOT EXISTS agent_chunks_embedding_ivfflat ON agent_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)');
        } else {
            // Non-Postgres dev fallback: store no embeddings.
            // (You can switch DB_CONNECTION=pgsql for real RAG.)
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_chunks');
    }
};
