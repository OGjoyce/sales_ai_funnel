<?php

namespace App\Services;

use App\Models\AgentFile;
use Illuminate\Support\Facades\Storage;

class AgentFileTextExtractor
{
    public function extractText(AgentFile $file): string
    {
        $path = $file->stored_path;
        $ext = strtolower((string)($file->extension ?? pathinfo($file->original_name, PATHINFO_EXTENSION)));
        $bytes = Storage::disk('local')->get($path);

        return match ($ext) {
            'txt', 'md' => $this->fromPlainText($bytes),
            'html', 'htm' => $this->fromHtml($bytes),
            'csv' => $this->fromCsv($bytes),
            'docx' => $this->fromDocxBytes($bytes),
            'xlsx' => $this->fromXlsxBytes($bytes),
            'pdf' => $this->fromPdfBytes($bytes),
            default => throw new \InvalidArgumentException("Unsupported file extension: {$ext}"),
        };
    }

    protected function fromPlainText(string $bytes): string
    {
        return trim($bytes);
    }

    protected function fromHtml(string $bytes): string
    {
        $html = $bytes;
        // Strip scripts/styles.
        $html = preg_replace('#<script[^>]*>.*?</script>#is', ' ', $html) ?? $html;
        $html = preg_replace('#<style[^>]*>.*?</style>#is', ' ', $html) ?? $html;
        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5);
        return trim($text);
    }

    protected function fromCsv(string $bytes): string
    {
        $rows = [];
        $fh = fopen('php://temp', 'r+');
        fwrite($fh, $bytes);
        rewind($fh);
        $i = 0;
        while (($row = fgetcsv($fh)) !== false) {
            $i++;
            if ($i > 5000) {
                break;
            }
            $rows[] = implode(' | ', array_map('trim', $row));
        }
        fclose($fh);
        return trim(implode("\n", $rows));
    }

    protected function fromDocxBytes(string $bytes): string
    {
        // DOCX is a zip: read word/document.xml
        $tmp = tempnam(sys_get_temp_dir(), 'docx');
        file_put_contents($tmp, $bytes);

        $zip = new \ZipArchive();
        if ($zip->open($tmp) !== true) {
            @unlink($tmp);
            throw new \RuntimeException('Unable to open DOCX');
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        @unlink($tmp);

        if (!$xml) {
            throw new \RuntimeException('DOCX missing word/document.xml');
        }

        // Remove tags, keep spaces.
        $text = strip_tags($xml);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5);
        return trim(preg_replace('/\s+/', ' ', $text) ?? $text);
    }

    protected function fromXlsxBytes(string $bytes): string
    {
        // XLSX parsing properly is non-trivial; require PhpSpreadsheet if available.
        if (class_exists('PhpOffice\\PhpSpreadsheet\\IOFactory')) {
            $tmp = tempnam(sys_get_temp_dir(), 'xlsx');
            file_put_contents($tmp, $bytes);
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($tmp);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($tmp);
            @unlink($tmp);

            $out = [];
            foreach ($spreadsheet->getWorksheetIterator() as $sheet) {
                $out[] = "# " . $sheet->getTitle();
                $rows = $sheet->toArray(null, true, true, false);
                $limit = min(count($rows), 1000);
                for ($i = 0; $i < $limit; $i++) {
                    $out[] = implode(' | ', array_map(fn($v) => is_scalar($v) ? trim((string)$v) : '', $rows[$i]));
                }
            }
            return trim(implode("\n", $out));
        }

        throw new \RuntimeException('XLSX support requires phpoffice/phpspreadsheet');
    }

    protected function fromPdfBytes(string $bytes): string
    {
        // Prefer Smalot\PdfParser if installed.
        if (class_exists('Smalot\\PdfParser\\Parser')) {
            $parser = new \Smalot\PdfParser\Parser();
            $pdf = $parser->parseContent($bytes);
            return trim($pdf->getText());
        }

        // Fallback to pdftotext if available.
        $bin = trim((string)@shell_exec('command -v pdftotext'));
        if ($bin !== '') {
            $tmpPdf = tempnam(sys_get_temp_dir(), 'pdf');
            $tmpTxt = tempnam(sys_get_temp_dir(), 'txt');
            file_put_contents($tmpPdf, $bytes);
            @shell_exec(sprintf('%s %s %s', escapeshellcmd($bin), escapeshellarg($tmpPdf), escapeshellarg($tmpTxt)));
            $text = @file_get_contents($tmpTxt) ?: '';
            @unlink($tmpPdf);
            @unlink($tmpTxt);
            return trim($text);
        }

        throw new \RuntimeException('PDF support requires smalot/pdfparser or pdftotext');
    }
}
