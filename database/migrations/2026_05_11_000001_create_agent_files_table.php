<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('agent_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('original_name');
            $table->string('stored_path');
            $table->string('mime_type')->nullable();
            $table->string('extension', 16)->nullable();
            $table->unsignedBigInteger('size_bytes');

            // queued | processing | ready | error
            $table->string('status', 24)->default('queued');
            $table->text('error')->nullable();

            $table->unsignedInteger('chunks_count')->default(0);
            $table->string('checksum_sha256', 64)->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_files');
    }
};
