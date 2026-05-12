<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('funnel_stage_id')->constrained('funnel_stages')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('name');
            $table->string('email')->nullable()->index();
            $table->string('phone', 64)->nullable()->index();
            $table->string('company')->nullable();
            $table->string('website')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('source', 32)->default('manual');
            $table->unsignedTinyInteger('score')->default(0);
            $table->json('raw_data')->nullable();
            $table->string('openai_thread_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
