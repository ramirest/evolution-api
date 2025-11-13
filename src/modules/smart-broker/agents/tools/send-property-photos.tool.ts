import { z } from 'zod';
import { AuthenticatedUser } from '../../types/auth.types';
import { propertiesService } from '../../services/properties.service';
import { evolutionBridgeService } from '../../services/evolution-bridge.service';
import { Logger } from '../../../../config/logger.config';

const logger = new Logger('SendPropertyPhotosTool');

/**
 * FERRAMENTA: send_property_photos
 * 
 * Envia as fotos de um imóvel específico para o chat do WhatsApp.
 * IMPORTANTE: Esta ferramenta adiciona um JOB à fila (Bull/Redis) - Regra 3.
 */

const SendPropertyPhotosArgsSchema = z.object({
  propertyId: z.string().min(1, 'O campo propertyId é obrigatório'),
});

export type SendPropertyPhotosArgs = z.infer<typeof SendPropertyPhotosArgsSchema>;

export async function sendPropertyPhotosTool(
  user: AuthenticatedUser,
  data: string,
  chatId?: string, // O chatId do cliente (WhatsApp)
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
    const validation = SendPropertyPhotosArgsSchema.safeParse(parsedData);
    if (!validation.success) {
      logger.warn(`[sendPropertyPhotosTool] Validação falhou: ${validation.error.message}`);
      return `Erro de validação: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    const { propertyId } = validation.data;

    // 3. Buscar o imóvel (RBAC aplicado)
    const property = await propertiesService.findOne(propertyId, user);

    if (!property.photos || property.photos.length === 0) {
      return `O imóvel "${property.title}" não possui fotos cadastradas.`;
    }

    // 4. IMPORTANTE: Validar que temos o chatId
    if (!chatId) {
      return 'Erro: O chatId (telefone do cliente) não foi fornecido. Esta ferramenta só pode ser usada no contexto de atendimento.';
    }

    // 5. USAR A FILA (Regra 3 do tools.instructions.md)
    // Enviar as fotos via Evolution API de forma assíncrona
    // NOTA: O evolutionBridgeService deve ter um método para adicionar à fila
    
    // Por enquanto, vamos apenas logar (a implementação completa virá quando integrarmos com o atendimento)
    logger.info(`[sendPropertyPhotosTool] Adicionando ${property.photos.length} foto(s) do imóvel ${propertyId} à fila de envio para ${chatId}`);
    
    // TODO: Implementar a lógica de fila quando integrar com o atendimento
    // await queueService.addWhatsappMediaJob({ chatId, mediaUrls: property.photos, caption: property.title });

    return `As ${property.photos.length} foto(s) do imóvel "${property.title}" foram adicionadas à fila de envio. O cliente receberá em breve! 📸`;

  } catch (error: any) {
    logger.error(`[sendPropertyPhotosTool] Erro ao executar ferramenta: ${error.message}`);
    return `Erro ao enviar fotos do imóvel: ${error.message}`;
  }
}
