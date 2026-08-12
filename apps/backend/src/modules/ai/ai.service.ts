import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import type { GenerateContentDto } from './dto/generate-content.dto';

const FETCH_TIMEOUT_MS = 30_000;

const TITLE_LINE_PREFIX = 'JUDUL:';
const BODY_SEPARATOR = '---';

const SYSTEM_PROMPT =
  'Anda adalah asisten penulis untuk website resmi kampus. Tulis konten dalam ' +
  'Bahasa Indonesia yang formal dan jelas. Balas PERSIS dalam dua bagian, tanpa ' +
  'komentar, basa-basi, atau penjelasan lain: baris pertama diawali ' +
  `"${TITLE_LINE_PREFIX} " diikuti judul singkat (maksimal sekitar 70 karakter, ` +
  'tanpa tanda kutip) yang merangkum permintaan ini sebagai judul halaman/berita; ' +
  `baris berikutnya persis "${BODY_SEPARATOR}"; lalu isi kontennya. Untuk isi ` +
  'konten, gunakan format Markdown sederhana berikut sesuai kebutuhan permintaan, ' +
  'karena setiap bagian akan diubah menjadi satu blok pada editor: pisahkan ' +
  'setiap paragraf dengan satu baris kosong; gunakan "- " di awal baris untuk ' +
  'daftar tanpa urutan atau "1. " untuk daftar berurutan (satu butir per baris, ' +
  'tanpa baris kosong di antara butir); gunakan "# ", "## ", dst. hanya jika ' +
  'diminta membuat judul/subjudul DI DALAM isi (berbeda dari judul halaman di ' +
  `baris "${TITLE_LINE_PREFIX}"); gunakan "> " untuk kutipan. Jangan gunakan ` +
  'markup lain (tanpa **tebal**, *miring*, tabel, atau blok kode) kecuali ' +
  'diminta secara eksplisit.';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

/**
 * Splits the model's `JUDUL: ...\n---\n...` reply into a page/news title and
 * the Markdown body. Falls back to no title (empty string) and the whole
 * reply as body when the model didn't follow the format — the frontend
 * treats an empty title as "nothing to fill in", so a malformed reply just
 * degrades to the old content-only behavior instead of failing outright.
 */
function splitTitleAndBody(raw: string): { title: string; text: string } {
  const lines = raw.split('\n');
  const first = lines[0]?.trim() ?? '';
  if (first.toUpperCase().startsWith(TITLE_LINE_PREFIX) && lines[1]?.trim() === BODY_SEPARATOR) {
    const title = first.slice(first.indexOf(':') + 1).trim();
    const text = lines.slice(2).join('\n').trim();
    if (title && text) return { title, text };
  }
  return { title: '', text: raw.trim() };
}

/** Calls the OpenAI-compatible chat completions endpoint configured via AI_API_*. */
@Injectable()
export class AiService {
  constructor(private readonly config: AppConfigService) {}

  async generate(dto: GenerateContentDto): Promise<{ title: string; text: string }> {
    const token = this.config.aiApiToken;
    if (!token) {
      throw new ServiceUnavailableException(
        'Fitur AI belum dikonfigurasi (AI_API_TOKEN belum diisi di server).',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.config.aiApiBaseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: this.config.aiApiModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: dto.prompt },
          ],
        }),
      });
    } catch {
      throw new BadGatewayException('Tidak bisa terhubung ke layanan AI.');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new BadGatewayException(
        `Layanan AI mengembalikan error (HTTP ${response.status})${detail ? `: ${detail.slice(0, 500)}` : ''}.`,
      );
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const raw = payload.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      throw new BadGatewayException('Layanan AI tidak mengembalikan konten.');
    }

    return splitTitleAndBody(raw);
  }
}
