import { z } from 'zod';
import { AuthenticatedUser } from '../../types/auth.types';
import { Logger } from '../../../../config/logger.config';

const logger = new Logger('TransferToHumanTool');

/**
 * FERRAMENTA: transfer_to_human
 * 
 * Transfere o atendimento de IA para um corretor humano.
 * Esta é a ferramenta de HANDOFF do sistema.
 */

const TransferToHumanArgsSchema = z.object({
  reason: z.string().min(1, 'O campo reason é obrigatório'),
});

export type TransferToHumanArgs = z.infer<typeof TransferToHumanArgsSchema>;

export async function transferToHumanTool(
  user: AuthenticatedUser,
  data: string,
  sessionId?: string, // O ID da sessão de atendimento
): Promise<string> {
  try {
    // 1. Parse do JSON
    let parsedData: any;
    try {
      parsedData = JSON.parse(data);
    } catch (parseError) {
      return 'Erro: O argumento "data" deve ser um JSON válido.';
    }

    // 2. Validação
    const validation = TransferToHumanArgsSchema.safeParse(parsedData);
    if (!validation.success) {
      logger.warn(`[transferToHumanTool] Validação falhou: ${validation.error.message}`);
      return `Erro de validação: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    const { reason } = validation.data;

    // 3. Validar que temos o sessionId
    if (!sessionId) {
      return 'Erro: O sessionId (ID da sessão de atendimento) não foi fornecido. Esta ferramenta só pode ser usada no contexto de atendimento.';
    }

    // 4. TODO: Integrar com sistema de atendimento
    logger.info(`[transferToHumanTool] Transferindo sessão ${sessionId} para humano. Motivo: ${reason}`);

    // TODO: Atualizar status da sessão no banco (PENDING_HUMAN_HANDOFF)
    // TODO: Notificar corretores via Socket.IO
    // TODO: Enviar mensagem de "aguarde" para o cliente

    return `🙏 HANDOFF_SOLICITADO: A transferência para um corretor humano foi iniciada. Motivo: "${reason}". Você não deve continuar o atendimento.`;

  } catch (error: any) {
    logger.error(`[transferToHumanTool] Erro ao executar ferramenta: ${error.message}`);
    return `Erro ao transferir para humano: ${error.message}`;
  }
}
