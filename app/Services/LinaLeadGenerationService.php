<?php

namespace App\Services;

use App\Models\FunnelStage;
use App\Models\Lead;
use App\Models\Product;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use OpenAI\Laravel\Facades\OpenAI;
use Throwable;

class LinaLeadGenerationService
{
    public function __construct(
        private OpenClawGateway $openClaw,
    ) {}

    /**
     * @param  array{
     *     sector: string,
     *     product_ids?: list<int>,
     *     product_notes?: string|null,
     *     channels: array{whatsapp: bool, email: bool, website: bool, gmail: bool}
     * }  $input
     * @return array{
     *     success: bool,
     *     leads_created: list<int>,
     *     instruction_sent_to_lina?: string,
     *     error?: string,
     *     mock?: bool
     * }
     */
    public function run(array $input): array
    {
        $maxLeads = 3;

        $channelLabels = [];
        if (! empty($input['channels']['whatsapp'])) {
            $channelLabels[] = 'número de WhatsApp';
        }
        if (! empty($input['channels']['email'])) {
            $channelLabels[] = 'correo corporativo de la empresa';
        }
        if (! empty($input['channels']['website'])) {
            $channelLabels[] = 'sitio web / página del negocio';
        }
        if (! empty($input['channels']['gmail'])) {
            $channelLabels[] = 'correo Gmail u otro correo personal cuando sea el único contacto público';
        }
        if ($channelLabels === []) {
            return ['success' => false, 'error' => 'Selecciona al menos un tipo de contacto a buscar.', 'leads_created' => []];
        }

        $productLines = [];
        $ids = $input['product_ids'] ?? [];
        if ($ids !== []) {
            $products = Product::query()->whereIn('id', $ids)->get(['id', 'title', 'code', 'description']);
            foreach ($products as $p) {
                $productLines[] = $p->title.(filled($p->code) ? " (código: {$p->code})" : '');
            }
        }
        $notes = trim((string) ($input['product_notes'] ?? ''));
        $productsText = $productLines === [] && $notes === ''
            ? '(el usuario no enlazó catálogo; infiere desde las notas o pide claridad en la instrucción)'
            : implode('; ', $productLines).($notes !== '' ? "\nNotas adicionales: {$notes}" : '');

        $instruction = $this->buildInstructionForLina(
            $productsText,
            $input['sector'],
            $channelLabels,
            $maxLeads,
        );

        if (filled(config('openai.api_key'))) {
            try {
                $instruction = $this->refineInstructionWithOpenAI(
                    $productsText,
                    $input['sector'],
                    $channelLabels,
                    $maxLeads,
                );
            } catch (Throwable $e) {
                Log::warning('Lina: OpenAI refine failed, using fallback instruction', ['e' => $e->getMessage()]);
            }
        }

        $result = $this->openClaw->callLinaAgent($instruction, $maxLeads);

        if (! ($result['success'] ?? false)) {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'OpenClaw no devolvió éxito',
                'leads_created' => [],
                'instruction_sent_to_lina' => $instruction,
            ];
        }

        $leads = $result['leads'] ?? [];
        if ($leads === [] && isset($result['raw']) && is_array($result['raw'])) {
            $leads = $this->openClaw->normalizeLeadsPayload($result['raw']);
        }

        $created = $this->persistLeads($leads);

        return [
            'success' => true,
            'leads_created' => $created,
            'instruction_sent_to_lina' => $instruction,
            'mock' => $result['mock'] ?? false,
        ];
    }

    /**
     * @param  list<string>  $channelLabels
     */
    private function buildInstructionForLina(string $productsText, string $sector, array $channelLabels, int $maxLeads): string
    {
        $channels = implode(', ', $channelLabels);

        return <<<TXT
Eres Lina, agente de prospección. Encuentra como máximo {$maxLeads} leads reales y verificables.

Qué vendemos / ofrecemos:
{$productsText}

Zona o sector objetivo:
{$sector}

Prioriza obtener y devolver en JSON (lista "leads") contactos que incluyan, cuando existan en fuentes públicas: {$channels}.
Cada lead: name, email (si aplica), phone, company, website, linkedin_url si lo encuentras.
TXT;
    }

    /**
     * @param  list<string>  $channelLabels
     */
    private function refineInstructionWithOpenAI(string $productsText, string $sector, array $channelLabels, int $maxLeads): string
    {
        $model = env('OPENAI_MODEL', 'gpt-4o-mini');
        $channels = implode(', ', $channelLabels);

        $user = <<<TXT
Genera UN solo texto de instrucción en español para el agente de prospección "Lina" en OpenClaw.
La instrucción debe ser ejecutable: qué buscar, dónde (sector/zona), qué datos de contacto priorizar, máximo {$maxLeads} leads.
Sin markdown, sin comillas envolventes, sin saludos.

Contexto comercial:
{$productsText}

Zona/sector:
{$sector}

Señales de contacto deseadas:
{$channels}
TXT;

        $response = OpenAI::chat()->create([
            'model' => $model,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Eres un redactor de briefs ultra concisos para agentes de investigación B2B. Solo devuelves el párrafo de instrucción.',
                ],
                ['role' => 'user', 'content' => $user],
            ],
            'max_tokens' => 900,
            'temperature' => 0.4,
        ]);

        $choice = $response->choices[0] ?? null;
        $text = trim((string) ($choice?->message->content ?? ''));

        return $text !== '' ? $text : $this->buildInstructionForLina($productsText, $sector, $channelLabels, $maxLeads);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<int>
     */
    private function persistLeads(array $rows): array
    {
        $firstStage = FunnelStage::query()->orderBy('sort_order')->first();
        if ($firstStage === null) {
            return [];
        }

        $created = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $email = isset($row['email']) && is_string($row['email']) && $row['email'] !== ''
                ? $row['email']
                : ('imported+'.Str::lower(Str::random(10)).'@placeholder.local');

            $lead = Lead::query()->firstOrCreate(
                ['email' => $email],
                [
                    'funnel_stage_id' => $firstStage->id,
                    'name' => (string) ($row['name'] ?? 'Unknown'),
                    'phone' => $row['phone'] ?? null,
                    'company' => $row['company'] ?? null,
                    'website' => $row['website'] ?? null,
                    'linkedin_url' => $row['linkedin_url'] ?? null,
                    'source' => 'lina',
                    'raw_data' => array_merge($row, ['via' => 'lina']),
                ]
            );

            if ($lead->wasRecentlyCreated) {
                $created[] = $lead->id;
            }
        }

        return $created;
    }
}
