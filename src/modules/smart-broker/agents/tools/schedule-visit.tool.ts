import { z } from 'zod';
import { AuthenticatedUser } from '../../types/auth.types';
import { Logger } from '../../../../config/logger.config';

const logger = new Logger('ScheduleVisitTool');

/**
 * FERRAMENTA: schedule_visit
 * 
 * Agenda uma visita presencial ao imóvel.
 */

const ScheduleVisitArgsSchema = z.object({
  propertyId: z.string().min(1, 'O campo propertyId é obrigatório'),
  dateTime: z.string().datetime('O campo dateTime deve estar no formato ISO 8601'),
});

export type ScheduleVisitArgs = z.infer<typeof ScheduleVisitArgsSchema>;

export async function scheduleVisitTool(
  user: AuthenticatedUser,
  data: string,
  contactId?: string, // O ID do contato (lead) que está agendando
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
    const validation = ScheduleVisitArgsSchema.safeParse(parsedData);
    if (!validation.success) {
      logger.warn(`[scheduleVisitTool] Validação falhou: ${validation.error.message}`);
      return `Erro de validação: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    const { propertyId, dateTime } = validation.data;

    // 3. Validar data (não permitir agendamento no passado)
    const scheduledDate = new Date(dateTime);
    if (scheduledDate < new Date()) {
      return 'Erro: Não é possível agendar uma visita no passado. Por favor, solicite uma data futura ao cliente.';
    }

    // 4. TODO: Integrar com sistema de agendamento
    // Por enquanto, apenas simular o agendamento
    logger.info(`[scheduleVisitTool] Visita agendada para imóvel ${propertyId} em ${dateTime} para contato ${contactId || 'N/A'}`);

    // TODO: Criar registro no banco de dados (tabela de Agendamentos)
    // TODO: Notificar corretor responsável via Socket.IO
    // TODO: Enviar SMS/WhatsApp de confirmação para o cliente

    const formattedDate = scheduledDate.toLocaleString('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    return `✅ Visita agendada com sucesso para ${formattedDate}! O cliente receberá uma confirmação em breve.`;

  } catch (error: any) {
    logger.error(`[scheduleVisitTool] Erro ao executar ferramenta: ${error.message}`);
    return `Erro ao agendar visita: ${error.message}`;
  }
}
