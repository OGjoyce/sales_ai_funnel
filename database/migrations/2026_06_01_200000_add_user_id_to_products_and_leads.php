<?php

use App\Models\LinaGenerationRun;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->uuid('lina_generation_run_id')->nullable()->after('user_id');
            $table->foreign('lina_generation_run_id')
                ->references('id')
                ->on('lina_generation_runs')
                ->nullOnDelete();
        });

        $ownerId = User::query()->orderBy('id')->value('id');

        if ($ownerId !== null) {
            DB::table('products')->whereNull('user_id')->update(['user_id' => $ownerId]);
            DB::table('leads')->whereNull('user_id')->update(['user_id' => $ownerId]);
        }

        $runs = LinaGenerationRun::query()->whereNotNull('leads_created')->get();
        foreach ($runs as $run) {
            $ids = $run->leads_created;
            if (! is_array($ids) || $ids === []) {
                continue;
            }
            DB::table('leads')
                ->whereIn('id', $ids)
                ->update([
                    'user_id' => $run->user_id,
                    'lina_generation_run_id' => $run->id,
                ]);
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->unique(['user_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'code']);
            $table->unique('code');
            $table->dropConstrainedForeignId('user_id');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['lina_generation_run_id']);
            $table->dropColumn('lina_generation_run_id');
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
