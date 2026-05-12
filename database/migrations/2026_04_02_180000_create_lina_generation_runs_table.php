<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lina_generation_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 32)->default('pending');
            $table->json('payload');
            $table->text('instruction_sent_to_lina')->nullable();
            $table->json('leads_created')->nullable();
            $table->text('error')->nullable();
            $table->boolean('mock')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lina_generation_runs');
    }
};
