<?php

namespace Database\Seeders;

use App\Models\FunnelStage;
use Illuminate\Database\Seeder;

class FunnelStageSeeder extends Seeder
{
    public function run(): void
    {
        $stages = [
            ['name' => 'Nuevo Lead', 'sort_order' => 1, 'color_token' => 'cryoblue'],
            ['name' => 'Contactado', 'sort_order' => 2, 'color_token' => 'pulsar'],
            ['name' => 'Interesado', 'sort_order' => 3, 'color_token' => 'arc'],
            ['name' => 'Calificado', 'sort_order' => 4, 'color_token' => 'core'],
            ['name' => 'Propuesta Enviada', 'sort_order' => 5, 'color_token' => 'plasma'],
            ['name' => 'Negociación', 'sort_order' => 6, 'color_token' => 'novapink'],
            ['name' => 'Ganado', 'sort_order' => 7, 'color_token' => 'tealray'],
            ['name' => 'Perdido', 'sort_order' => 8, 'color_token' => 'muted'],
        ];

        foreach ($stages as $row) {
            FunnelStage::query()->updateOrCreate(
                ['name' => $row['name']],
                $row
            );
        }
    }
}
