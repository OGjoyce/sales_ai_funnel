<?php

namespace App\Services;

use App\Models\Lead;
use Illuminate\Support\Facades\Log;
use OpenAI\Laravel\Facades\OpenAI;
use Throwable;

class OutboundMessageRefinementService
{
    /**
     * Mejora redacción, ortografía y tono; no inventa datos ni promesas.
     */
    public function refineForWhatsapp(string $draft, ?Lead $lead = null): string
    {
        if (! filled(config('openai.api_key')) || trim($draft) === '') {
            return $draft;
        }

        $ctx = $this->leadContext($lead);
        $model = env('OPENAI_MODEL', 'gpt-4o-mini');

        try {
            $response = OpenAI::chat()->create([
                'model' => $model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => <<<'TXT'
Eres editor de mensajes comerciales por WhatsApp en español.
Devuelve SOLO el texto final del mensaje, sin comillas ni markdown.
Mejora claridad, ortografía y tono profesional y cercano; conserva el idioma del borrador.
No añadas datos, precios ni compromisos que no estén en el borrador.
Mantén el mensaje conciso (idealmente bajo ~900 caracteres).
TXT,
                    ],
                    [
                        'role' => 'user',
                        'content' => $ctx."Borrador a mejorar:\n---\n{$draft}\n---",
                    ],
                ],
                'max_tokens' => 1200,
                'temperature' => 0.35,
            ]);

            $text = trim((string) ($response->choices[0]->message->content ?? ''));

            return $text !== '' ? $text : $draft;
        } catch (Throwable $e) {
            Log::warning('Outbound refine WhatsApp failed', ['e' => $e->getMessage()]);

            return $draft;
        }
    }

    /**
     * @return array{subject: string, body: string}
     */
    public function refineForEmail(string $subject, string $body, ?Lead $lead = null): array
    {
        if (! filled(config('openai.api_key')) || (trim($subject) === '' && trim($body) === '')) {
            return ['subject' => $subject, 'body' => $body];
        }

        $ctx = $this->leadContext($lead);
        $model = env('OPENAI_MODEL', 'gpt-4o-mini');

        try {
            $response = OpenAI::chat()->create([
                'model' => $model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => <<<'TXT'
Eres editor de correos B2B en español.
Responde SOLO con un JSON válido: {"subject":"...","body":"..."}
Sin markdown, sin texto fuera del JSON.
Mejora asunto y cuerpo: claridad, ortografía, tono profesional; conserva el idioma.
No inventes datos, plazos ni ofertas que no aparezcan en el borrador.
TXT,
                    ],
                    [
                        'role' => 'user',
                        'content' => $ctx."Asunto actual:\n{$subject}\n\nCuerpo actual:\n---\n{$body}\n---",
                    ],
                ],
                'max_tokens' => 2500,
                'temperature' => 0.35,
            ]);

            $raw = trim((string) ($response->choices[0]->message->content ?? ''));
            if ($raw === '') {
                return ['subject' => $subject, 'body' => $body];
            }

            if (preg_match('/^```(?:json)?\s*([\s\S]*?)\s*```/m', $raw, $m)) {
                $raw = trim($m[1]);
            }

            $decoded = json_decode($raw, true);
            if (! is_array($decoded)) {
                return ['subject' => $subject, 'body' => $body];
            }

            $newSubject = isset($decoded['subject']) && is_string($decoded['subject'])
                ? trim($decoded['subject'])
                : $subject;
            $newBody = isset($decoded['body']) && is_string($decoded['body'])
                ? trim($decoded['body'])
                : $body;

            if ($newSubject === '' && $newBody === '') {
                return ['subject' => $subject, 'body' => $body];
            }

            return [
                'subject' => $newSubject !== '' ? $newSubject : $subject,
                'body' => $newBody !== '' ? $newBody : $body,
            ];
        } catch (Throwable $e) {
            Log::warning('Outbound refine email failed', ['e' => $e->getMessage()]);

            return ['subject' => $subject, 'body' => $body];
        }
    }

    private function leadContext(?Lead $lead): string
    {
        if ($lead === null) {
            return '';
        }

        $parts = array_filter([$lead->name, $lead->company]);

        return $parts === [] ? '' : 'Contexto del destinatario: '.implode(', ', $parts).".\n\n";
    }
}
